export interface Migration {
  /** Sequential: 1, 2, 3… Stored in PRAGMA user_version after applying. */
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}
