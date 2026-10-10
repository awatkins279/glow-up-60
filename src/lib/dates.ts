/**
 * Date helpers. A "day" rolls over at 4:00 AM so that bedtime items logged
 * shortly after midnight still count toward the evening they belong to.
 */
export const DAY_ROLLOVER_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDayKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The day key that a given moment belongs to (applies the 4 AM rollover). */
export function dayKeyFor(now: Date): string {
  const d = new Date(now);
  if (d.getHours() < DAY_ROLLOVER_HOUR) d.setDate(d.getDate() - 1);
  return toDayKey(d);
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime();
  return Math.round(ms / 86400000);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(key: string): number {
  const js = parseDayKey(key).getDay();
  return js === 0 ? 7 : js;
}

/** Monday of the week containing `key`. Used as the week identifier. */
export function weekKeyFor(key: string): string {
  return addDays(key, -(isoWeekday(key) - 1));
}

/** All seven day keys (Mon..Sun) of the week containing `key`. */
export function weekDays(key: string): string[] {
  const mon = weekKeyFor(key);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** Days left in the week including today (Mon = 7, Sun = 1). */
export function daysLeftInWeek(key: string): number {
  return 8 - isoWeekday(key);
}

export function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function formatHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function format12h(t: string): string {
  const mins = parseHHMM(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(m)} ${ampm}`;
}

export function formatTime(d: Date): string {
  return format12h(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

export function prettyDate(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** 1-based program day number for a given day key. */
export function programDay(startDate: string, key: string): number {
  return diffDays(startDate, key) + 1;
}

export function phaseFor(day: number): string {
  if (day <= 14) return 'Foundation';
  if (day <= 42) return 'Build';
  return 'Peak';
}

/** Build a Date for `dayKey` at `HH:mm` local time. */
export function dateAt(dayKey: string, hhmm: string): Date {
  const d = parseDayKey(dayKey);
  const mins = parseHHMM(hhmm);
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
