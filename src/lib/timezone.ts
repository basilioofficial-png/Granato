import type { TimeZoneId } from '@/domain/types';

/** IANA time zone the device is set to right now. */
export function deviceTimeZone(): TimeZoneId {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
