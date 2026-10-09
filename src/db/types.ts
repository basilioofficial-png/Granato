/** Values we store: text, numbers and NULL. Booleans are stored as 0/1. */
export type SqlValue = string | number | null;

export interface SqlRunResult {
  /** Number of rows inserted, updated or deleted. */
  readonly changes: number;
}

/**
 * Minimal synchronous database interface used by migrations and repositories.
 * The app implements it with expo-sqlite, tests with Node's built-in SQLite,
 * so the same SQL is exercised in both places.
 *
 * Synchronous on purpose: a sync transaction cannot be interleaved with other
 * queries, and our queries are tiny (thousands of rows at most).
 */
export interface SqlDatabase {
  /** Runs one or more statements without parameters (schema, pragmas). */
  exec(sql: string): void;
  run(sql: string, params?: readonly SqlValue[]): SqlRunResult;
  get<Row>(sql: string, params?: readonly SqlValue[]): Row | null;
  all<Row>(sql: string, params?: readonly SqlValue[]): Row[];
  /** Runs `task` atomically: everything is committed, or nothing is. Not re-entrant. */
  transaction<T>(task: () => T): T;
}
