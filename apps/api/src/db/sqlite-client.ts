import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import type { DatabaseClient, DatabaseParameter } from './database-client';

function getDatabasePath(): string {
  return process.env.MEETING2ACTION_DB_PATH ?? resolve(process.cwd(), 'data', 'meeting2action.db');
}

function loadSchemaSql(): string {
  const baseSchemaPath = resolve(process.cwd(), 'docs', 'api', 'tasks-table.sql');
  const baseSchema = readFileSync(baseSchemaPath, 'utf8');

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
