import type { SqlDatabase } from '@/db/types';

export function getMeta(db: SqlDatabase, key: string): string | null {
  return db.get<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [key])?.value ?? null;
}

export function setMeta(db: SqlDatabase, key: string, value: string): void {
  db.run(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}
