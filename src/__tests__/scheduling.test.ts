import {
  addDays,
  dayKeyFor,
  daysLeftInWeek,
  isoWeekday,
  weekDays,
  weekKeyFor,
} from '../lib/dates';
import { SEED_ITEMS } from '../lib/seed';
import {
  allWeeklyQuotasMet,
  dayProgress,
  dayStatuses,
  itemStatus,
  weeklyQuotas,
  type CompletionIndex,
} from '../lib/scheduling';
import type { Completion, Item } from '../lib/types';

// 2026-10-05 is a Monday.
const MON = '2026-10-05';
const TUE = addDays(MON, 1);
const WED = addDays(MON, 2);
const THU = addDays(MON, 3);
const FRI = addDays(MON, 4);
const SAT = addDays(MON, 5);
const SUN = addDays(MON, 6);
const NEXT_MON = addDays(MON, 7);

const byId = (id: string): Item => {
  const it = SEED_ITEMS.find((i) => i.id === id);
  if (!it) throw new Error(`missing seed ${id}`);
  return it;
};

function complete(index: CompletionIndex, itemId: string, date: string, at = 12 * 60): CompletionIndex {
  const d = new Date(`${date}T00:00:00`);
  d.setMinutes(at);
  const c: Completion = {
    itemId,
    date,
    at: d.getTime(),
    points: 10,
    base: 10,
    streakMult: 1,
    timingMult: 1,
    comboMult: 1,
    timingLabel: null,
  };
  return { ...index, [date]: { ...(index[date] ?? {}), [itemId]: c } };
}

describe('dates', () => {
  it('weeks run Monday to Sunday', () => {
    expect(isoWeekday(MON)).toBe(1);
    expect(isoWeekday(SUN)).toBe(7);
    expect(weekKeyFor(SUN)).toBe(MON);
    expect(weekKeyFor(NEXT_MON)).toBe(NEXT_MON);
    expect(weekDays(WED)).toEqual([MON, TUE, WED, THU, FRI, SAT, SUN]);
  });

  it('days left in week includes today', () => {
    expect(daysLeftInWeek(MON)).toBe(7);
    expect(daysLeftInWeek(FRI)).toBe(3);
    expect(daysLeftInWeek(SUN)).toBe(1);
  });

  it('day rolls over at 4 AM', () => {
    expect(dayKeyFor(new Date(2026, 9, 6, 1, 30))).toBe(MON); // 1:30 AM Tuesday → still Monday
    expect(dayKeyFor(new Date(2026, 9, 6, 4, 0))).toBe(TUE);
    expect(dayKeyFor(new Date(2026, 9, 6, 23, 59))).toBe(TUE);
  });
});

describe('daily items', () => {
  it('are always due and never urgent', () => {
    const s = itemStatus(byId('vitamins'), {}, WED);
    expect(s.due).toBe(true);
    expect(s.urgent).toBe(false);
    expect(s.weekly).toBe(false);
  });

  it('reflect same-day completion', () => {
    const idx = complete({}, 'vitamins', WED);
    expect(itemStatus(byId('vitamins'), idx, WED).completed).toBe(true);
    expect(itemStatus(byId('vitamins'), idx, THU).completed).toBe(false);
  });
});

describe('weekly quota math', () => {
  const tanning = byId('tanning'); // 3x / week, no back-to-back off

  it('counts completions in the current week only', () => {
    let idx = complete({}, tanning.id, MON);
    idx = complete(idx, tanning.id, TUE);
    const s = itemStatus(tanning, idx, WED);
    expect(s.doneThisWeek).toBe(2);
    expect(s.remaining).toBe(1);
    expect(s.quota).toBe(3);
    expect(s.due).toBe(true);
  });

  it('shows Done this week once the quota is met', () => {
    let idx = complete({}, tanning.id, MON);
    idx = complete(idx, tanning.id, TUE);
    idx = complete(idx, tanning.id, WED);
    const thu = itemStatus(tanning, idx, THU);
    expect(thu.doneForWeek).toBe(true);
    expect(thu.due).toBe(false);
    // The day it was completed still shows as done on the list.
    const wed = itemStatus(tanning, idx, WED);
    expect(wed.completed).toBe(true);
    expect(wed.due).toBe(true);
  });

  it('rolls over on Monday', () => {
    let idx = complete({}, tanning.id, FRI);
    idx = complete(idx, tanning.id, SAT);
    idx = complete(idx, tanning.id, SUN);
    expect(itemStatus(tanning, idx, SUN).doneForWeek).toBe(false);
    const nextMon = itemStatus(tanning, idx, NEXT_MON);
    expect(nextMon.doneThisWeek).toBe(0);
    expect(nextMon.remaining).toBe(3);
    expect(nextMon.due).toBe(true);
  });

  it('only counts days up to the evaluated day (past-day evaluation)', () => {
    let idx = complete({}, tanning.id, MON);
    idx = complete(idx, tanning.id, FRI);
    expect(itemStatus(tanning, idx, WED).doneThisWeek).toBe(1);
    expect(itemStatus(tanning, idx, SAT).doneThisWeek).toBe(2);
  });
});

describe('urgency (MUST DO TODAY)', () => {
  const tanning = byId('tanning'); // 3x

  it('is urgent when days left <= remaining', () => {
    // Friday with 0 done: 3 days left, 3 remaining → urgent.
    expect(itemStatus(tanning, {}, FRI).urgent).toBe(true);
    // Thursday with 0 done: 4 days left, 3 remaining → not urgent.
    expect(itemStatus(tanning, {}, THU).urgent).toBe(false);
    // Sunday with 2 done: 1 left, 1 remaining → urgent.
    let idx = complete({}, tanning.id, MON);
    idx = complete(idx, tanning.id, TUE);
    expect(itemStatus(tanning, idx, SUN).urgent).toBe(true);
  });

  it('1x/week item is urgent only on Sunday', () => {
    const weekly1: Item = { ...tanning, id: 'weekly1', frequency: { kind: 'weekly', times: 1 } };
    expect(itemStatus(weekly1, {}, SAT).urgent).toBe(false);
    expect(itemStatus(weekly1, {}, SUN).urgent).toBe(true);
  });

  it('respects fixed weekdays when counting days left', () => {
    const fixed: Item = { ...tanning, fixedWeekdays: [1, 3, 5] }; // Mon, Wed, Fri
    expect(itemStatus(fixed, {}, TUE).notScheduledToday).toBe(true);
    expect(itemStatus(fixed, {}, TUE).due).toBe(false);
    // Monday: 3 available days (Mon, Wed, Fri), 3 remaining → urgent already.
    expect(itemStatus(fixed, {}, MON).urgent).toBe(true);
  });
});

describe('no back-to-back days', () => {
  const workout = byId('workout'); // 3x / week, noBackToBack ON

  it('hides the item the day after a completion when not needed', () => {
    const idx = complete({}, workout.id, MON);
    const tue = itemStatus(workout, idx, TUE);
    expect(tue.resting).toBe(true);
    expect(tue.due).toBe(false);
    expect(itemStatus(workout, idx, WED).due).toBe(true);
  });

  it('shows the item the day after a completion when needed for the quota', () => {
    // First workout on Thursday → Fri would be hidden, but then only Sat/Sun
    // remain and alternating gives 1 < 2 remaining → must show Friday.
    const idx = complete({}, workout.id, THU);
    const fri = itemStatus(workout, idx, FRI);
    expect(fri.resting).toBe(false);
    expect(fri.due).toBe(true);
  });

  it('never hides when quota would be unreachable even with alternation', () => {
    let idx = complete({}, workout.id, FRI);
    const sat = itemStatus(workout, idx, SAT);
    expect(sat.due).toBe(true);
    expect(sat.urgent).toBe(true);
    idx = complete(idx, workout.id, SAT);
    const sun = itemStatus(workout, idx, SUN);
    expect(sun.due).toBe(true);
    expect(sun.urgent).toBe(true);
  });

  it('does not apply once the quota is met', () => {
    let idx = complete({}, workout.id, MON);
    idx = complete(idx, workout.id, WED);
    idx = complete(idx, workout.id, FRI);
    const sat = itemStatus(workout, idx, SAT);
    expect(sat.doneForWeek).toBe(true);
    expect(sat.resting).toBe(false);
  });
});

describe('day progress + week helpers', () => {
  it('computes percent over due items only', () => {
    // Monday, nothing done: all 17 seed items are due.
    expect(dayProgress(SEED_ITEMS, {}, MON).total).toBe(17);
    let idx = complete({}, 'workout', MON);
    // Tuesday: workout resting → 16 due.
    const p = dayProgress(SEED_ITEMS, idx, TUE);
    expect(p.total).toBe(16);
    idx = complete(idx, 'vitamins', TUE);
    expect(dayProgress(SEED_ITEMS, idx, TUE).done).toBe(1);
    expect(dayProgress(SEED_ITEMS, idx, TUE).percent).toBeCloseTo(1 / 16);
  });

  it('weeklyQuotas + allWeeklyQuotasMet look at the whole week', () => {
    let idx: CompletionIndex = {};
    for (const q of weeklyQuotas(SEED_ITEMS, idx, MON)) {
      for (let i = 0; i < q.quota; i++) idx = complete(idx, q.item.id, addDays(MON, i));
    }
    expect(allWeeklyQuotasMet(SEED_ITEMS, idx, WED)).toBe(true);
    expect(allWeeklyQuotasMet(SEED_ITEMS, idx, NEXT_MON)).toBe(false);
  });

  it('sorts statuses by item order', () => {
    const ids = dayStatuses(SEED_ITEMS, {}, MON).map((s) => s.item.id);
    expect(ids[0]).toBe('am-skin');
    expect(ids[ids.length - 1]).toBe('sleep');
    expect(ids).not.toContain('mole-check');
    expect(ids).toContain('protein-shake');
  });
});
