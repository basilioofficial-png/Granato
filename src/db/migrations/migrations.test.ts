import { configureConnection } from '@/db/connection';
import { getSchemaVersion, migrate, MIGRATIONS } from '@/db/migrations';
import { openTestDatabase } from '@/db/testing/nodeSqliteDatabase';

describe('migrate', () => {
  it('creates the schema on an empty database', () => {
    const db = openTestDatabase();
    configureConnection(db);
    expect(migrate(db)).toEqual({ fromVersion: 0, toVersion: MIGRATIONS.length });

    const tables = db
      .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .map((t) => t.name);
    expect(tables).toEqual(['app_meta', 'categories', 'experiments', 'time_entries']);
  });

  it('is idempotent: a second run applies nothing', () => {
    const db = openTestDatabase();
    migrate(db);
    expect(migrate(db)).toEqual({ fromVersion: MIGRATIONS.length, toVersion: MIGRATIONS.length });
  });

  it('applies only pending migrations, in order', () => {
    const db = openTestDatabase();
    migrate(db);
    const extra = [
      ...MIGRATIONS,
      { version: MIGRATIONS.length + 1, name: 'test', sql: 'CREATE TABLE extra (id TEXT);' },
    ];
    expect(migrate(db, extra)).toEqual({
      fromVersion: MIGRATIONS.length,
      toVersion: MIGRATIONS.length + 1,
    });
  });

  it('rolls back a failing migration completely', () => {
    const db = openTestDatabase();
    migrate(db);
    const broken = [
      ...MIGRATIONS,
      {
        version: MIGRATIONS.length + 1,
        name: 'broken',
        sql: 'CREATE TABLE half (id TEXT); THIS IS NOT SQL;',
      },
    ];
    expect(() => migrate(db, broken)).toThrow();
    expect(getSchemaVersion(db)).toBe(MIGRATIONS.length);
    expect(db.get("SELECT name FROM sqlite_master WHERE name = 'half'")).toBeNull();
  });

  it('refuses to run on a database from a newer app version', () => {
    const db = openTestDatabase();
    db.exec('PRAGMA user_version = 99');
    expect(() => migrate(db)).toThrow(/newer than this app supports/);
  });

  it('rejects non-sequential migration lists', () => {
    const db = openTestDatabase();
    expect(() => migrate(db, [{ version: 2, name: 'x', sql: '' }])).toThrow(/sequential/);
  });
});
