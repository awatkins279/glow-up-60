import { addDays } from '../lib/dates';
import { SEED_ITEMS, defaultSettings } from '../lib/seed';
import type { CompletionIndex } from '../lib/scheduling';
import {
  advanceCombo,
  bonusPoints,
  comboMultiplier,
  computePoints,
  dayScore,
  evaluateStreak,
  isPerfectDay,
  isPerfectNight,
  levelFor,
  streakMultiplier,
  timingMultiplier,
  totalScore,
  weekScore,
} from '../lib/scoring';
import type { Completion, Item, StreakState } from '../lib/types';

const MON = '2026-10-05';
const settings = defaultSettings(MON);
const byId = (id: string): Item => SEED_ITEMS.find((i) => i.id === id)!;
const at = (date: string, h: number, m = 0) => new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);

function complete(index: CompletionIndex, itemId: string, date: string, when: Date, points = 10): CompletionIndex {
  const c: Completion = {
    itemId,
    date,
    at: when.getTime(),
    points,
    base: points,
    streakMult: 1,
    timingMult: 1,
    comboMult: 1,
    timingLabel: null,
  };
  return { ...index, [date]: { ...(index[date] ?? {}), [itemId]: c } };
}

describe('streak multiplier', () => {
  it('grows 0.1x per day and caps at 3.0x', () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(1)).toBe(1.1);
    expect(streakMultiplier(14)).toBe(2.4);
    expect(streakMultiplier(20)).toBe(3.0);
    expect(streakMultiplier(45)).toBe(3.0);
  });
});

describe('timing multiplier', () => {
  it('night injections 7:30–8:30 PM are ON TIME (1.5x)', () => {
    const inj = byId('tesamorelin');
    expect(timingMultiplier(inj, at(MON, 19, 30), settings)).toEqual({ mult: 1.5, label: 'ON TIME' });
    expect(timingMultiplier(inj, at(MON, 20, 30), settings)).toEqual({ mult: 1.5, label: 'ON TIME' });
    expect(timingMultiplier(inj, at(MON, 20, 31), settings).mult).toBe(1.0);
    expect(timingMultiplier(inj, at(MON, 19, 29), settings).mult).toBe(1.0);
  });

  it('shifts the injection window with the setting', () => {
    const inj = byId('tesamorelin');
    const s = { ...settings, injectionTime: '21:00' };
    expect(timingMultiplier(inj, at(MON, 20, 0), s).mult).toBe(1.0);
    expect(timingMultiplier(inj, at(MON, 21, 20), s).mult).toBe(1.5);
  });

  it('bedtime items before 10:45 PM are 1.25x', () => {
    const pm = byId('pm-skin');
    expect(timingMultiplier(pm, at(MON, 22, 44), settings).mult).toBe(1.25);
    expect(timingMultiplier(pm, at(MON, 22, 45), settings).mult).toBe(1.0);
  });

  it('anything after bedtime is 0.5x PAST BEDTIME, including after midnight', () => {
    const pm = byId('pm-skin');
    expect(timingMultiplier(pm, at(MON, 23, 0), settings)).toEqual({ mult: 0.5, label: 'PAST BEDTIME' });
    expect(timingMultiplier(byId('vitamins'), at(MON, 23, 30), settings).mult).toBe(0.5);
    expect(timingMultiplier(byId('tesamorelin'), at(MON, 1, 0), settings).mult).toBe(0.5);
  });

  it('bedtime setting shifts the past-bedtime cutoff and the early-night window', () => {
    const pm = byId('pm-skin');
    const s = { ...settings, bedtime: '00:30' };
    // Bedtime after midnight: 23:30 is an hour early (1.25x), 00:20 is inside the last 15 min (1.0x), 00:35 is past.
    expect(timingMultiplier(pm, at(MON, 23, 30), s).mult).toBe(1.25);
    expect(timingMultiplier(pm, at(MON, 0, 20), s).mult).toBe(1.0);
    expect(timingMultiplier(pm, at(MON, 0, 35), s).mult).toBe(0.5);
    const s2 = { ...settings, bedtime: '22:00' };
    expect(timingMultiplier(pm, at(MON, 22, 0), s2).mult).toBe(0.5);
    expect(timingMultiplier(pm, at(MON, 21, 44), s2).mult).toBe(1.25);
  });

  it('morning items before 10 AM are 1.25x', () => {
    const v = byId('vitamins');
    expect(timingMultiplier(v, at(MON, 9, 59), settings).mult).toBe(1.25);
    expect(timingMultiplier(v, at(MON, 10, 0), settings).mult).toBe(1.0);
  });

  it('everything else is 1.0x', () => {
    expect(timingMultiplier(byId('water'), at(MON, 15, 0), settings)).toEqual({ mult: 1.0, label: null });
  });
});

describe('combo', () => {
  it('adds 0.25x per task within 10 minutes, caps at 2.0x, resets after 10 minutes', () => {
    const t0 = Date.now();
    let c = advanceCombo({ count: 0, lastAt: null }, t0);
    expect(c.count).toBe(0);
    expect(comboMultiplier(c.count)).toBe(1.0);
    c = advanceCombo(c, t0 + 5 * 60_000);
    expect(c.count).toBe(1);
    expect(comboMultiplier(c.count)).toBe(1.25);
    c = advanceCombo(c, t0 + 9 * 60_000);
    c = advanceCombo(c, t0 + 12 * 60_000);
    expect(c.count).toBe(3);
    expect(comboMultiplier(c.count)).toBe(1.75);
    c = advanceCombo(c, t0 + 13 * 60_000);
    c = advanceCombo(c, t0 + 14 * 60_000);
    expect(comboMultiplier(c.count)).toBe(2.0);
    // Gap > 10 min resets.
    c = advanceCombo(c, t0 + 14 * 60_000 + 10 * 60_000 + 1);
    expect(c.count).toBe(0);
  });
});

describe('points math', () => {
  it('multiplies and rounds', () => {
    expect(computePoints(25, 2.4, 1.0, 1.0)).toBe(60);
    expect(computePoints(25, 1.0, 1.5, 1.25)).toBe(47); // 46.875
    expect(computePoints(10, 3.0, 0.5, 2.0)).toBe(30);
  });
  it('bonuses scale with streak', () => {
    expect(bonusPoints(100, 1.0)).toBe(100);
    expect(bonusPoints(50, 2.4)).toBe(120);
    expect(bonusPoints(300, 3.0)).toBe(900);
  });
});

describe('levels', () => {
  it('maps total score to titles and progress', () => {
    expect(levelFor(0).level.title).toBe('Rookie');
    expect(levelFor(1499).level.title).toBe('Rookie');
    expect(levelFor(1500).level.title).toBe('Grinder');
    expect(levelFor(5000).level.title).toBe('Locked In');
    expect(levelFor(10000).level.title).toBe('Disciplined');
    expect(levelFor(18000).level.title).toBe('Glow Mode');
    expect(levelFor(30000).level.title).toBe('Main Character');
    expect(levelFor(30000).next).toBeNull();
    expect(levelFor(750).progress).toBeCloseTo(0.5);
  });
});

describe('scores', () => {
  it('sums completions + bonuses per day / week / total', () => {
    const TUE = addDays(MON, 1);
    const NEXT_MON = addDays(MON, 7);
    let idx = complete({}, 'vitamins', MON, at(MON, 9), 12);
    idx = complete(idx, 'water', MON, at(MON, 14), 10);
    idx = complete(idx, 'water', TUE, at(TUE, 14), 10);
    idx = complete(idx, 'water', NEXT_MON, at(NEXT_MON, 14), 10);
    const dayB = { [MON]: { perfectDay: 100 } };
    const weekB = { [MON]: { quest: 300 }, [NEXT_MON]: { checkin: 150 } };
    expect(dayScore(idx, dayB, MON)).toBe(122);
    expect(dayScore(idx, dayB, TUE)).toBe(10);
    expect(weekScore(idx, dayB, weekB, TUE)).toBe(432);
    expect(weekScore(idx, dayB, weekB, NEXT_MON)).toBe(160);
    expect(totalScore(idx, dayB, weekB)).toBe(592);
  });
});

describe('streak evaluation', () => {
  const fresh: StreakState = { days: 0, freezes: 0, evaluatedThrough: null, freezesEarnedAtDays: 0 };

  /** Complete ≥ 80 % of the seed items on a day. */
  function goodDay(idx: CompletionIndex, date: string): CompletionIndex {
    for (const it of SEED_ITEMS) idx = complete(idx, it.id, date, at(date, 12));
    return idx;
  }

  it('counts consecutive ≥80% days through yesterday only', () => {
    let idx: CompletionIndex = {};
    for (let i = 0; i < 3; i++) idx = goodDay(idx, addDays(MON, i));
    const today = addDays(MON, 3);
    const s = evaluateStreak(fresh, SEED_ITEMS, idx, MON, today);
    expect(s.days).toBe(3);
    expect(s.evaluatedThrough).toBe(addDays(MON, 2));
    // Re-evaluating the same day is a no-op.
    expect(evaluateStreak(s, SEED_ITEMS, idx, MON, today)).toEqual(s);
  });

  it('a day under 80% resets the streak when no freeze is held', () => {
    let idx: CompletionIndex = {};
    idx = goodDay(idx, MON);
    idx = complete(idx, 'vitamins', addDays(MON, 1), at(addDays(MON, 1), 9)); // 1 of 17
    const s = evaluateStreak(fresh, SEED_ITEMS, idx, MON, addDays(MON, 2));
    expect(s.days).toBe(0);
  });

  it('earns a freeze every 7 streak days (max 2) and auto-uses it on a miss', () => {
    let idx: CompletionIndex = {};
    for (let i = 0; i < 7; i++) idx = goodDay(idx, addDays(MON, i));
    let s = evaluateStreak(fresh, SEED_ITEMS, idx, MON, addDays(MON, 7));
    expect(s.days).toBe(7);
    expect(s.freezes).toBe(1);
    // Day 8 missed entirely → freeze consumed, streak preserved.
    s = evaluateStreak(s, SEED_ITEMS, idx, MON, addDays(MON, 8));
    expect(s.days).toBe(7);
    expect(s.freezes).toBe(0);
    // Day 9 missed → no freeze → reset.
    s = evaluateStreak(s, SEED_ITEMS, idx, MON, addDays(MON, 9));
    expect(s.days).toBe(0);
  });

  it('caps freezes at 2', () => {
    let idx: CompletionIndex = {};
    for (let i = 0; i < 21; i++) idx = goodDay(idx, addDays(MON, i));
    const s = evaluateStreak(fresh, SEED_ITEMS, idx, MON, addDays(MON, 21));
    expect(s.days).toBe(21);
    expect(s.freezes).toBe(2);
  });
});

describe('perfect day / night', () => {
  it('perfect day needs 100% of due items', () => {
    let idx: CompletionIndex = {};
    for (const it of SEED_ITEMS) idx = complete(idx, it.id, MON, at(MON, 12));
    expect(isPerfectDay(SEED_ITEMS, idx, MON)).toBe(true);
    const { vitamins: _drop, ...rest } = idx[MON];
    expect(isPerfectDay(SEED_ITEMS, { [MON]: rest }, MON)).toBe(false);
  });

  it('perfect night needs every night + bedtime item done before bedtime', () => {
    const nightIds = SEED_ITEMS.filter((i) => i.slot === 'night' || i.slot === 'bedtime').map((i) => i.id);
    let idx: CompletionIndex = {};
    for (const id of nightIds) idx = complete(idx, id, MON, at(MON, 21));
    expect(isPerfectNight(SEED_ITEMS, idx, MON, settings)).toBe(true);
    // One of them after 11 PM → not perfect.
    idx = complete(idx, 'in-bed', MON, at(MON, 23, 10));
    expect(isPerfectNight(SEED_ITEMS, idx, MON, settings)).toBe(false);
  });

  it('perfect night ignores weekly night items already done for the week', () => {
    const TUE = addDays(MON, 1);
    let idx: CompletionIndex = {};
    // Glutathione 2x done Mon + ... we just complete it Monday twice isn't possible; do Mon and mark quota via a second day.
    idx = complete(idx, 'glutathione', MON, at(MON, 20));
    idx = complete(idx, 'glutathione', TUE, at(TUE, 20));
    const WED = addDays(MON, 2);
    const due = SEED_ITEMS.filter(
      (i) => (i.slot === 'night' || i.slot === 'bedtime') && i.id !== 'glutathione' && i.id !== 'melanotan',
    );
    // Melanotan has no-back-to-back but wasn't done Tue → due Wed. Complete it too.
    for (const it of [...due, byId('melanotan')]) idx = complete(idx, it.id, WED, at(WED, 20));
    expect(isPerfectNight(SEED_ITEMS, idx, WED, settings)).toBe(true);
  });
});
