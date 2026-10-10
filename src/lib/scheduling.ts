import { addDays, daysLeftInWeek, isoWeekday, weekDays } from './dates';
import type { Completion, Item } from './types';

/** completions[dayKey][itemId] */
export type CompletionIndex = Record<string, Record<string, Completion>>;

export interface ItemStatus {
  item: Item;
  /** Completed on the evaluated day. */
  completed: boolean;
  completion: Completion | null;
  weekly: boolean;
  /** Weekly quota (1 for daily items, used for pips only on weekly items). */
  quota: number;
  /** Completions this week up to and including the evaluated day. */
  doneThisWeek: number;
  /** Quota still outstanding after the evaluated day's completions. */
  remaining: number;
  /** Weekly item whose quota is already met (and not completed today) → collapsed "Done this week". */
  doneForWeek: boolean;
  /** MUST DO TODAY: not enough days left in the week to finish the quota otherwise. */
  urgent: boolean;
  /** Hidden by the no-back-to-back rule (completed yesterday and not needed today). */
  resting: boolean;
  /** Item has fixed weekdays and today isn't one of them. */
  notScheduledToday: boolean;
  /** Appears on the day's active checklist (or was completed that day). */
  due: boolean;
}

export function getCompletion(index: CompletionIndex, date: string, itemId: string): Completion | null {
  return index[date]?.[itemId] ?? null;
}

/** Completions of `item` in the week of `date`, counting only days <= date. */
export function completionsThisWeek(index: CompletionIndex, item: Item, date: string): number {
  return weekDays(date).filter((d) => d <= date && !!index[d]?.[item.id]).length;
}

/** Completions of `item` across the entire week containing `date` (all seven days). */
export function completionsWholeWeek(index: CompletionIndex, item: Item, date: string): number {
  return weekDays(date).filter((d) => !!index[d]?.[item.id]).length;
}

function isScheduledOn(item: Item, date: string): boolean {
  if (item.fixedWeekdays.length === 0) return true;
  return item.fixedWeekdays.includes(isoWeekday(date));
}

/** Days from `date` to Sunday (inclusive) on which the item may be done. */
function availableDaysLeft(item: Item, date: string): number {
  const left = daysLeftInWeek(date);
  if (item.fixedWeekdays.length === 0) return left;
  let n = 0;
  for (let i = 0; i < left; i++) {
    if (isScheduledOn(item, addDays(date, i))) n++;
  }
  return n;
}

export function itemStatus(item: Item, index: CompletionIndex, date: string): ItemStatus {
  const completion = getCompletion(index, date, item.id);
  const completed = !!completion;

  if (item.frequency.kind === 'daily') {
    return {
      item,
      completed,
      completion,
      weekly: false,
      quota: 1,
      doneThisWeek: completionsThisWeek(index, item, date),
      remaining: completed ? 0 : 1,
      doneForWeek: false,
      urgent: false,
      resting: false,
      notScheduledToday: false,
      due: true,
    };
  }

  const quota = item.frequency.times;
  const doneThisWeek = completionsThisWeek(index, item, date);
  const remaining = Math.max(0, quota - doneThisWeek);

  const base = {
    item,
    completed,
    completion,
    weekly: true,
    quota,
    doneThisWeek,
    remaining,
    doneForWeek: false,
    urgent: false,
    resting: false,
    notScheduledToday: false,
    due: true,
  };

  if (completed) return base;
  if (remaining === 0) return { ...base, doneForWeek: true, due: false };
  if (!isScheduledOn(item, date)) return { ...base, notScheduledToday: true, due: false };

  const daysLeft = availableDaysLeft(item, date);
  const urgent = daysLeft <= remaining;

  // No back-to-back: completed yesterday → hide today unless skipping today
  // would make the quota unreachable (alternating days from tomorrow onward).
  if (item.noBackToBack && item.fixedWeekdays.length === 0) {
    const completedYesterday = !!getCompletion(index, addDays(date, -1), item.id);
    if (completedYesterday) {
      const achievableIfSkipToday = Math.ceil((daysLeft - 1) / 2);
      const needed = remaining > achievableIfSkipToday;
      if (!needed) return { ...base, resting: true, due: false };
    }
  }

  return { ...base, urgent };
}

export function dayStatuses(items: Item[], index: CompletionIndex, date: string): ItemStatus[] {
  return [...items].sort((a, b) => a.order - b.order).map((it) => itemStatus(it, index, date));
}

export interface DayProgress {
  total: number;
  done: number;
  percent: number; // 0..1
}

export function dayProgress(items: Item[], index: CompletionIndex, date: string): DayProgress {
  const active = dayStatuses(items, index, date).filter((s) => s.due);
  const done = active.filter((s) => s.completed).length;
  return { total: active.length, done, percent: active.length === 0 ? 0 : done / active.length };
}

export interface WeeklyQuotaStatus {
  item: Item;
  done: number;
  quota: number;
  remaining: number;
}

/** Weekly-quota items and how far along they are for the whole week containing `date`. */
export function weeklyQuotas(items: Item[], index: CompletionIndex, date: string): WeeklyQuotaStatus[] {
  return items
    .filter((it) => it.frequency.kind === 'weekly')
    .map((item) => {
      const quota = item.frequency.kind === 'weekly' ? item.frequency.times : 1;
      const done = completionsWholeWeek(index, item, date);
      return { item, done, quota, remaining: Math.max(0, quota - done) };
    });
}

export function allWeeklyQuotasMet(items: Item[], index: CompletionIndex, date: string): boolean {
  const q = weeklyQuotas(items, index, date);
  return q.length > 0 && q.every((s) => s.remaining === 0);
}
