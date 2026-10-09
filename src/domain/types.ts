/** Moment in time: milliseconds since Unix epoch, always UTC. */
export type EpochMs = number;

/** IANA time zone name, e.g. "Europe/Moscow". */
export type TimeZoneId = string;

export type EntrySource = 'live' | 'manual';

/**
 * Half-open time interval [start, end): `start` is included, `end` is not.
 * Two intervals that only touch (a.end === b.start) do not overlap.
 */
export interface Interval {
  readonly start: EpochMs;
  readonly end: EpochMs;
}

/** Mirrors the `time_entries` table (see ARCHITECTURE.md, section 4.2). */
export interface TimeEntry {
  readonly id: string;
  readonly userId: string | null;
  readonly categoryId: string;
  readonly startedAt: EpochMs;
  /** `null` means the entry is running right now. */
  readonly endedAt: EpochMs | null;
  /** Time zone of the device when the entry started; used for day bucketing. */
  readonly timezone: TimeZoneId;
  readonly source: EntrySource;
  readonly isEdited: boolean;
  readonly note: string | null;
  readonly createdAt: EpochMs;
  readonly updatedAt: EpochMs;
  readonly deletedAt: EpochMs | null;
}

/** Mirrors the `categories` table. An "activity" is any node of this tree. */
export interface Category {
  readonly id: string;
  readonly userId: string | null;
  readonly parentId: string | null;
  readonly name: string;
  readonly color: string;
  readonly icon: string | null;
  readonly sortOrder: number;
  /** `null` = not a favorite; otherwise position of the quick button. */
  readonly favoriteRank: number | null;
  readonly archivedAt: EpochMs | null;
  readonly createdAt: EpochMs;
  readonly updatedAt: EpochMs;
  readonly deletedAt: EpochMs | null;
}

/** Calendar date in some time zone (month is 1–12). */
export interface LocalDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}
