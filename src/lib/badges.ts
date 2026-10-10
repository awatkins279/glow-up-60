import { addDays, programDay, weekDays, weekKeyFor } from './dates';
import { completionsWholeWeek, type CompletionIndex } from './scheduling';
import { displayStreak, streakMultiplier, type DayBonuses } from './scoring';
import type { BadgeId, ComboState, Item, StreakState, WorkoutSession } from './types';

export interface BadgeContext {
  items: Item[];
  index: CompletionIndex;
  streak: StreakState;
  combo: ComboState;
  dayBonuses: DayBonuses;
  sessions: WorkoutSession[];
  startDate: string;
  today: string;
  earned: Partial<Record<BadgeId, number>>;
}

function consecutiveDaysEndingAt(today: string, n: number, test: (d: string) => boolean): boolean {
  // Accept a run ending today or yesterday (today may not be finished yet).
  for (const end of [today, addDays(today, -1)]) {
    let ok = true;
    for (let i = 0; i < n; i++) {
      if (!test(addDays(end, -i))) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function skinWeekComplete(items: Item[], index: CompletionIndex, anyDay: string): boolean {
  const skin = items.filter((i) => i.category === 'Skin');
  if (skin.length === 0) return false;
  const days = weekDays(anyDay);
  return skin.every((it) => {
    if (it.frequency.kind === 'daily') return days.every((d) => !!index[d]?.[it.id]);
    return completionsWholeWeek(index, it, anyDay) >= it.frequency.times;
  });
}

/** Badge ids that are newly earned given the context (excludes already-earned). */
export function checkBadges(ctx: BadgeContext): BadgeId[] {
  const { items, index, streak, combo, dayBonuses, sessions, startDate, today, earned } = ctx;
  const out: BadgeId[] = [];
  const has = (id: BadgeId) => earned[id] !== undefined;
  const add = (id: BadgeId, cond: boolean) => {
    if (!has(id) && cond) out.push(id);
  };

  const workoutItem = items.find((i) => i.link === 'workout');
  const workoutDone =
    sessions.some((s) => s.finishedAt !== null) ||
    (!!workoutItem && Object.values(index).some((day) => !!day[workoutItem.id]));
  add('first_workout', workoutDone);

  const sd = displayStreak(streak, items, index, today);
  add('streak_7', sd >= 7);
  add('streak_14', sd >= 14);
  add('streak_30', sd >= 30);
  add('max_multiplier', streakMultiplier(streak.days) >= 3.0);
  add('combo_king', combo.count >= 5);

  add(
    'night_owl',
    consecutiveDaysEndingAt(today, 7, (d) => (dayBonuses[d]?.perfectNight ?? 0) > 0),
  );

  const protein = items.find((i) => i.link === 'protein');
  add(
    'protein_machine',
    !!protein && consecutiveDaysEndingAt(today, 7, (d) => !!index[d]?.[protein.id]),
  );

  add(
    'skin_discipline',
    skinWeekComplete(items, index, weekKeyFor(today)) ||
      skinWeekComplete(items, index, addDays(weekKeyFor(today), -7)),
  );

  const day = programDay(startDate, today);
  add('halfway', day >= 30);
  add('glow_complete', day >= 60);

  return out;
}
