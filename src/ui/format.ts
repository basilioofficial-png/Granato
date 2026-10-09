import type { EpochMs, LocalDate, TimeZoneId } from '@/domain/types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 3 723 000 ms → "01:02:03". Hours keep growing past 24 ("27:00:00"). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const clockFormatters = new Map<TimeZoneId, Intl.DateTimeFormat>();

/** Wall-clock time with seconds in the given zone, 24-hour: "14:03:12". */
export function formatClockTime(instant: EpochMs, timeZone: TimeZoneId): string {
  let formatter = clockFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    clockFormatters.set(timeZone, formatter);
  }
  return formatter.format(instant);
}

/** "14 ч 22 мин", "45 мин", "3 ч" — for totals and toasts. */
export function formatHoursMinutes(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${pad(minutes)} мин`;
}

/** Wall-clock time without seconds: "09:05". */
export function formatHourMinute(instant: EpochMs, timeZone: TimeZoneId): string {
  return formatClockTime(instant, timeZone).slice(0, 5);
}

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/**
 * "Пятница, 9 октября". Built by hand instead of Intl with the ru locale:
 * the result does not depend on locale data available on the device.
 */
export function formatDayTitle(date: LocalDate): string {
  const weekday = WEEKDAYS[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()];
  return `${weekday ?? ''}, ${date.day} ${MONTHS_GENITIVE[date.month - 1] ?? ''}`;
}

/** Russian plural: pluralRu(3, ['активность', 'активности', 'активностей']) → "активности". */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const WEEKDAYS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function sameDate(a: LocalDate, b: LocalDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Day switcher label: "Сегодня, пт 9 октября", "Вчера, чт 8 октября", "Ср, 7 октября",
 * with the year only when it differs from today's.
 */
export function formatHistoryDayLabel(date: LocalDate, today: LocalDate): string {
  const weekday = WEEKDAYS_SHORT[new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()] ?? '';
  const dayMonth = `${date.day} ${MONTHS_GENITIVE[date.month - 1] ?? ''}${
    date.year !== today.year ? ` ${date.year}` : ''
  }`;
  const yesterday = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));
  if (sameDate(date, today)) return `Сегодня, ${weekday} ${dayMonth}`;
  if (
    sameDate(date, {
      year: yesterday.getUTCFullYear(),
      month: yesterday.getUTCMonth() + 1,
      day: yesterday.getUTCDate(),
    })
  ) {
    return `Вчера, ${weekday} ${dayMonth}`;
  }
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}
