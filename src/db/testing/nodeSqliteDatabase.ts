import type { SqlDatabase, SqlValue } from '@/db/types';

// Test-only adapter over Node's built-in SQLite (node:sqlite, Node >= 22.13).
// Never imported by the app bundle.

interface NodeStatement {
  run(...params: SqlValue[]): { changes: number | bigint };
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
}

interface NodeDatabaseSync {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}

interface NodeSqliteModule {
  DatabaseSync: new (path: string) => NodeDatabaseSync;
}

function loadNodeSqlite(): NodeSqliteModule {
  // getBuiltinModule bypasses Jest's module resolver, which does not know node:sqlite.
  const nodeProcess = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } })
    .process;
  const sqlite = nodeProcess?.getBuiltinModule?.('node:sqlite');
  if (!sqlite) throw new Error('node:sqlite is not available: Node.js >= 22.13 is required');
  return sqlite as NodeSqliteModule;
}

/** Fresh in-memory database for a test. */
export function openTestDatabase(): SqlDatabase {
  const { DatabaseSync } = loadNodeSqlite();
  const native = new DatabaseSync(':memory:');

  const db: SqlDatabase = {
    exec: (sql) => native.exec(sql),
    run: (sql, params = []) => ({ changes: Number(native.prepare(sql).run(...params).changes) }),
    get: <Row,>(sql: string, params: readonly SqlValue[] = []) =>
      (native.prepare(sql).get(...params) ?? null) as Row | null,
    all: <Row,>(sql: string, params: readonly SqlValue[] = []) =>
      native.prepare(sql).all(...params) as Row[],
    transaction: <T,>(task: () => T): T => {
      native.exec('BEGIN');
      try {
        const result = task();
        native.exec('COMMIT');
        return result;
      } catch (error) {
        native.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return db;
}
