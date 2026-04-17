import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

import type { DatabaseClient, DatabaseParameter } from './database-client';

function getDatabasePath(): string {
  return process.env.MEETING2ACTION_DB_PATH ?? resolve(process.cwd(), 'data', 'meeting2action.db');
}

export class SqliteDatabaseClient implements DatabaseClient {
  private readonly database: DatabaseSync;

  constructor(databasePath = getDatabasePath()) {
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA foreign_keys = ON;');
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