import { DAY_ROLLOVER_HOUR, addDays, minutesOfDay, parseHHMM, weekDays } from './dates';
import { dayProgress, dayStatuses, type CompletionIndex } from './scheduling';
import {
  LEVELS,
  type ComboState,
  type DayBonusKey,
  type Item,
  type LevelDef,
  type Settings,
  type StreakState,
  type WeekBonusKey,
} from './types';

export const STREAK_STEP = 0.1;
export const STREAK_CAP = 3.0;
export const STREAK_DAY_THRESHOLD = 0.8;
export const MAX_FREEZES = 2;
export const COMBO_WINDOW_MS = 10 * 60 * 1000;
export const COMBO_STEP = 0.25;
export const COMBO_CAP = 2.0;

export const BONUS = {
  perfectDay: 100,
  perfectNight: 50,
  quest: 300,
  checkin: 150,
} as const;

export function streakMultiplier(days: number): number {
  return Math.min(STREAK_CAP, Math.round((1 + STREAK_STEP * days) * 10) / 10);
}

export interface TimingResult {
  mult: number;
  label: string | null;
}

/**
 * Timing multiplier for completing `item` at moment `at`.
 * Windows are derived from settings so changing bedtime / injection time shifts them.
 */
/** Minutes since the 4 AM rollover, so a bedtime after midnight still compares correctly. */
export function relMinutes(minutesOfDayValue: number): number {
  return (minutesOfDayValue - DAY_ROLLOVER_HOUR * 60 + 1440) % 1440;
}

export function isPastBedtime(at: Date, settings: Settings): boolean {
  return relMinutes(minutesOfDay(at)) >= relMinutes(parseHHMM(settings.bedtime));
}

export function timingMultiplier(item: Item, at: Date, settings: Settings): TimingResult {
  const mins = minutesOfDay(at);
  const rel = relMinutes(mins);
  const bedtimeRel = relMinutes(parseHHMM(settings.bedtime));
  const inj = parseHHMM(settings.injectionTime);

  // After bedtime (through the 4 AM rollover) → half points.
  if (rel >= bedtimeRel) {
    return { mult: 0.5, label: 'PAST BEDTIME' };
  }
  if (item.category === 'Injections' && item.slot === 'night' && Math.abs(mins - inj) <= 30) {
    return { mult: 1.5, label: 'ON TIME' };
  }
  if (item.slot === 'bedtime' && rel < bedtimeRel - 15) {
    return { mult: 1.25, label: 'EARLY NIGHT' };
  }
  if (item.slot === 'morning' && mins < 10 * 60) {
    return { mult: 1.25, label: 'EARLY BIRD' };
  }
  return { mult: 1.0, label: null };
}

export function comboMultiplier(count: number): number {
  return Math.min(COMBO_CAP, 1 + COMBO_STEP * count);
}

/** Combo state after a completion at `at`. */
export function advanceCombo(combo: ComboState, at: number): ComboState {
  if (combo.lastAt !== null && at - combo.lastAt <= COMBO_WINDOW_MS) {
    return { count: combo.count + 1, lastAt: at };
  }
  return { count: 0, lastAt: at };
}

export function isComboActive(combo: ComboState, now: number): boolean {
  return combo.lastAt !== null && now - combo.lastAt <= COMBO_WINDOW_MS;
}

export function computePoints(base: number, streak: number, timing: number, combo: number): number {
  return Math.round(base * streak * timing * combo);
}

export function bonusPoints(flat: number, streakMult: number): number {
  return Math.round(flat * streakMult);
}

export interface LevelInfo {
  level: LevelDef;
  next: LevelDef | null;
  /** 0..1 progress toward the next level. */
  progress: number;
}

export function levelFor(total: number): LevelInfo {
  let level = LEVELS[0];
  for (const l of LEVELS) if (total >= l.minScore) level = l;
  const next = LEVELS[level.index + 1] ?? null;
  const progress = next
    ? Math.min(1, Math.max(0, (total - level.minScore) / (next.minScore - level.minScore)))
    : 1;
  return { level, next, progress };
}

export type DayBonuses = Record<string, Partial<Record<DayBonusKey, number>>>;
export type WeekBonuses = Record<string, Partial<Record<WeekBonusKey, number>>>;

export function dayScore(index: CompletionIndex, dayBonuses: DayBonuses, date: string): number {
  const comps = Object.values(index[date] ?? {}).reduce((s, c) => s + c.points, 0);
  const bon = Object.values(dayBonuses[date] ?? {}).reduce((s, v) => s + (v ?? 0), 0);
  return comps + bon;
}

export function weekScore(
  index: CompletionIndex,
  dayBonuses: DayBonuses,
  weekBonuses: WeekBonuses,
  date: string,
): number {
  const days = weekDays(date);
  const base = days.reduce((s, d) => s + dayScore(index, dayBonuses, d), 0);
  const wb = Object.values(weekBonuses[days[0]] ?? {}).reduce((s, v) => s + (v ?? 0), 0);
  return base + wb;
}

export function totalScore(index: CompletionIndex, dayBonuses: DayBonuses, weekBonuses: WeekBonuses): number {
  const dates = new Set([...Object.keys(index), ...Object.keys(dayBonuses)]);
  let total = 0;
  for (const d of dates) total += dayScore(index, dayBonuses, d);
  for (const w of Object.values(weekBonuses)) {
    total += Object.values(w).reduce((s, v) => s + (v ?? 0), 0);
  }
  return total;
}

/** Is the day a "streak day" (≥ 80 % of its items done)? */
export function isStreakDay(items: Item[], index: CompletionIndex, date: string): boolean {
  const p = dayProgress(items, index, date);
  return p.total > 0 && p.percent >= STREAK_DAY_THRESHOLD;
}

/**
 * Advance the streak through yesterday. Walks every unevaluated day from the
 * program start (or the day after `evaluatedThrough`) up to and including
 * `yesterday`. A freeze is earned on every 7th streak day (max 2 held) and is
 * auto-consumed instead of resetting the streak when a day is missed.
 */
export function evaluateStreak(
  streak: StreakState,
  items: Item[],
  index: CompletionIndex,
  startDate: string,
  today: string,
): StreakState {
  const yesterday = addDays(today, -1);
  let { days, freezes, freezesEarnedAtDays } = streak;
  let cursor = streak.evaluatedThrough ? addDays(streak.evaluatedThrough, 1) : startDate;
  if (cursor < startDate) cursor = startDate;
  let evaluatedThrough = streak.evaluatedThrough;

  while (cursor <= yesterday) {
    if (isStreakDay(items, index, cursor)) {
      days += 1;
      if (days % 7 === 0 && days > freezesEarnedAtDays) {
        freezes = Math.min(MAX_FREEZES, freezes + 1);
        freezesEarnedAtDays = days;
      }
    } else if (freezes > 0) {
      freezes -= 1;
    } else {
      days = 0;
      freezesEarnedAtDays = 0;
    }
    evaluatedThrough = cursor;
    cursor = addDays(cursor, 1);
  }

  return { days, freezes, evaluatedThrough, freezesEarnedAtDays };
}

/** Streak including today when today already qualifies (for display + badges). */
export function displayStreak(streak: StreakState, items: Item[], index: CompletionIndex, today: string): number {
  return streak.days + (isStreakDay(items, index, today) ? 1 : 0);
}

/** All Night + Bedtime items due today were completed before bedtime. */
export function isPerfectNight(items: Item[], index: CompletionIndex, date: string, settings: Settings): boolean {
  const statuses = dayStatuses(items, index, date).filter(
    (s) => s.due && (s.item.slot === 'night' || s.item.slot === 'bedtime'),
  );
  if (statuses.length === 0) return false;
  return statuses.every((s) => !!s.completion && !isPastBedtime(new Date(s.completion.at), settings));
}

export function isPerfectDay(items: Item[], index: CompletionIndex, date: string): boolean {
  const p = dayProgress(items, index, date);
  return p.total > 0 && p.done === p.total;
}
