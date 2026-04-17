export type DatabaseParameter = string | number | bigint | Uint8Array | null;

export interface DatabaseClient {
  all<T>(sql: string, params?: DatabaseParameter[]): Promise<T[]>;
  get<T>(sql: string, params?: DatabaseParameter[]): Promise<T | undefined>;
  run(sql: string, params?: DatabaseParameter[]): Promise<void>;
}