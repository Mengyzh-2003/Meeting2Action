import { randomInt } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { DatabaseClient, DatabaseParameter } from './database-client';
import { hashPassword, isPasswordHash } from '../modules/auth/password';

function generateSixDigitPassword(): string {
  return String(randomInt(100000, 1000000));
}

function generateFallbackStudentId(usedStudentIds: Set<string>): string {
  let nextStudentId = '';

  while (!nextStudentId || usedStudentIds.has(nextStudentId)) {
    nextStudentId = String(randomInt(100000000, 1000000000));
  }

  return nextStudentId;
}

function getDatabasePath(): string {
  return process.env.MEETING2ACTION_DB_PATH ?? resolve(process.cwd(), 'data', 'meeting2action.db');
}

function loadSchemaSql(): string {
  const baseSchemaPath = resolve(process.cwd(), 'docs', 'api', 'tasks-table.sql');
  const baseSchema = readFileSync(baseSchemaPath, 'utf8')
    .replace(
      /CREATE INDEX IF NOT EXISTS idx_tasks_owner_member_id ON tasks \(owner_member_id\);\r?\n?/,
      '',
    )
    .replace(
      /CREATE INDEX IF NOT EXISTS idx_members_student_id ON members \(student_id\);\r?\n?/,
      '',
    );

  const intakeSchema = `
CREATE TABLE IF NOT EXISTS meeting_intakes (
  id TEXT NOT NULL PRIMARY KEY,
  meeting_id TEXT,
  operator_name TEXT NOT NULL CHECK (length(operator_name) <= 50),
  source_type TEXT NOT NULL CHECK (source_type IN ('text', 'file')),
  source_name TEXT CHECK (source_name IS NULL OR length(source_name) <= 255),
  source_content TEXT NOT NULL,
  normalized_content TEXT NOT NULL,
  parser_mode TEXT NOT NULL CHECK (parser_mode IN ('auto', 'heuristic', 'llm')),
  parser_engine TEXT NOT NULL CHECK (length(parser_engine) <= 50),
  status TEXT NOT NULL CHECK (status IN ('parsed', 'failed', 'imported')),
  summary TEXT,
  action_items_json TEXT NOT NULL DEFAULT '[]',
  error_message TEXT,
  parsed_at TEXT,
  imported_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meeting_intakes_meeting_id ON meeting_intakes (meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_intakes_operator_name ON meeting_intakes (operator_name);
CREATE INDEX IF NOT EXISTS idx_meeting_intakes_status ON meeting_intakes (status);
CREATE INDEX IF NOT EXISTS idx_meeting_intakes_created_at ON meeting_intakes (created_at);

CREATE TRIGGER IF NOT EXISTS trg_meeting_intakes_updated_at
AFTER UPDATE ON meeting_intakes
FOR EACH ROW
BEGIN
  UPDATE meeting_intakes
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT NOT NULL PRIMARY KEY,
  member_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_member_id ON user_sessions (member_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions (expires_at);
`;

  return `${baseSchema}\n${intakeSchema}`;
}

export class SqliteDatabaseClient implements DatabaseClient {
  private readonly database: DatabaseSync;

  constructor(databasePath = getDatabasePath()) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON;');
    this.database.exec(loadSchemaSql());
    this.migrateMemberNameUniqueness();
    this.migrateMemberCredentials();
    this.migrateTaskOwnerMember();
  }

  private migrateMemberNameUniqueness(): void {
    this.database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_name_unique ON members (name);');
  }

  private migrateMemberCredentials(): void {
    const columns = this.database.prepare('PRAGMA table_info(members)').all() as Array<{ name: string }>;
    const hasGrade = columns.some((column) => column.name === 'grade');
    const hasStudentId = columns.some((column) => column.name === 'student_id');
    const hasPassword = columns.some((column) => column.name === 'password');

    if (!hasStudentId) {
      this.database.exec('ALTER TABLE members ADD COLUMN student_id TEXT;');
    }

    if (!hasPassword) {
      this.database.exec('ALTER TABLE members ADD COLUMN password TEXT;');
    }

    type LegacyMemberRow = {
      id: string;
      legacy_student_id: string | null;
      grade: string | null;
      password: string | null;
    };

    const rows = this.database.prepare(`
      SELECT
        id,
        student_id AS legacy_student_id,
        ${hasGrade ? 'grade' : 'NULL'} AS grade,
        password
      FROM members
      ORDER BY created_at ASC, name ASC
    `).all() as LegacyMemberRow[];

    const usedStudentIds = new Set<string>();
    const updateStudentStatement = this.database.prepare('UPDATE members SET student_id = ? WHERE id = ?');
    const updatePasswordStatement = this.database.prepare('UPDATE members SET password = ? WHERE id = ?');

    for (const row of rows) {
      const baseStudentId = row.legacy_student_id?.trim() || row.grade?.trim() || '';
      const nextStudentId = !baseStudentId || usedStudentIds.has(baseStudentId)
        ? generateFallbackStudentId(usedStudentIds)
        : baseStudentId;

      usedStudentIds.add(nextStudentId);
      updateStudentStatement.run(nextStudentId, row.id);

      const password = row.password?.trim();
      if (!password) {
        updatePasswordStatement.run(hashPassword(generateSixDigitPassword()), row.id);
      } else if (!isPasswordHash(password)) {
        updatePasswordStatement.run(hashPassword(password), row.id);
      }
    }

    this.database.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_student_id_unique ON members (student_id);');
    this.database.exec('CREATE INDEX IF NOT EXISTS idx_members_student_id ON members (student_id);');
  }

  private migrateTaskOwnerMember(): void {
    const columns = this.database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>;
    const hasOwnerMemberId = columns.some((column) => column.name === 'owner_member_id');

    if (!hasOwnerMemberId) {
      this.database.exec('ALTER TABLE tasks ADD COLUMN owner_member_id TEXT;');
    }

    this.database.exec('CREATE INDEX IF NOT EXISTS idx_tasks_owner_member_id ON tasks (owner_member_id);');

    this.database.exec(`
      UPDATE tasks
      SET owner_member_id = (
        SELECT id
        FROM members
        WHERE members.name = tasks.owner_name
        LIMIT 1
      )
      WHERE owner_name IS NOT NULL
        AND (owner_member_id IS NULL OR owner_member_id = '')
    `);
  }

  async all<T>(sql: string, params: DatabaseParameter[] = []): Promise<T[]> {
    const statement = this.database.prepare(sql);
    return statement.all(...params) as T[];
  }

  async get<T>(sql: string, params: DatabaseParameter[] = []): Promise<T | undefined> {
    const statement = this.database.prepare(sql);
    return statement.get(...params) as T | undefined;
  }

  async run(sql: string, params: DatabaseParameter[] = []): Promise<void> {
    const statement = this.database.prepare(sql);
    statement.run(...params);
  }
}

export function createSqliteDatabaseClient(databasePath?: string): SqliteDatabaseClient {
  return new SqliteDatabaseClient(databasePath);
}
