import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlDatabase, SqlValue } from '@/db/types';

function wrap(native: SQLiteDatabase): SqlDatabase {
  return {
    exec: (sql) => native.execSync(sql),
    run: (sql, params = []) => ({ changes: native.runSync(sql, [...params]).changes }),
    get: <Row,>(sql: string, params: readonly SqlValue[] = []) =>
      native.getFirstSync<Row>(sql, [...params]),
    all: <Row,>(sql: string, params: readonly SqlValue[] = []) =>
      native.getAllSync<Row>(sql, [...params]),
    transaction: <T,>(task: () => T): T => {
      let result: { value: T } | null = null;
      native.withTransactionSync(() => {
        result = { value: task() };
      });
      if (result === null) throw new Error('Transaction finished without a result');
      return (result as { value: T }).value;
    },
  };
}

export function openExpoSqliteDatabase(name: string): SqlDatabase {
  return wrap(openDatabaseSync(name));
}
