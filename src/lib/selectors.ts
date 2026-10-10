import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { addDays, dayKeyFor, phaseFor, programDay } from './dates';
import { dayProgress, dayStatuses, type ItemStatus } from './scheduling';
import {
  comboMultiplier,
  dayScore,
  displayStreak,
  isComboActive,
  levelFor,
  streakMultiplier,
  totalScore,
  weekScore,
} from './scoring';
import { PROGRAM_DAYS, SLOT_ORDER, type Slot } from './types';
import { useStore } from '@/store/useStore';

/** Re-renders once a minute and whenever the app day changes. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useToday(): string {
  const now = useNow();
  return dayKeyFor(now);
}

export interface SlotGroup {
  slot: Slot;
  items: ItemStatus[];
}

export function useTodayBoard() {
  const today = useToday();
  const { items, completions } = useStore(useShallow((s) => ({ items: s.items, completions: s.completions })));
  const statuses = dayStatuses(items, completions, today);
  const active = statuses.filter((s) => s.due);
  const urgent = active.filter((s) => s.urgent && !s.completed);
  const groups: SlotGroup[] = SLOT_ORDER.map((slot) => ({
    slot,
    items: active.filter((s) => s.item.slot === slot && !(s.urgent && !s.completed)),
  })).filter((g) => g.items.length > 0);
  const doneForWeek = statuses.filter((s) => s.doneForWeek);
  const resting = statuses.filter((s) => s.resting || s.notScheduledToday);
  const progress = dayProgress(items, completions, today);
  return { today, statuses, active, urgent, groups, doneForWeek, resting, progress };
}

export function useScores() {
  const today = useToday();
  const { completions, dayBonuses, weekBonuses } = useStore(
    useShallow((s) => ({ completions: s.completions, dayBonuses: s.dayBonuses, weekBonuses: s.weekBonuses })),
  );
  const todayScore = dayScore(completions, dayBonuses, today);
  const week = weekScore(completions, dayBonuses, weekBonuses, today);
  const total = totalScore(completions, dayBonuses, weekBonuses);
  let bestOther = 0;
  for (const d of new Set([...Object.keys(completions), ...Object.keys(dayBonuses)])) {
    if (d === today) continue;
    bestOther = Math.max(bestOther, dayScore(completions, dayBonuses, d));
  }
  const personalBest = todayScore > 0 && todayScore > bestOther;
  return { today, todayScore, week, total, personalBest, bestOther, level: levelFor(total) };
}

export function useMultipliers() {
  const now = useNow(5_000);
  const today = dayKeyFor(now);
  const { streak, combo, items, completions } = useStore(
    useShallow((s) => ({ streak: s.streak, combo: s.combo, items: s.items, completions: s.completions })),
  );
  const streakMult = streakMultiplier(streak.days);
  const comboActive = isComboActive(combo, now.getTime());
  const comboMult = comboActive ? comboMultiplier(combo.count) : 1;
  const comboCount = comboActive ? combo.count : 0;
  const streakDays = displayStreak(streak, items, completions, today);
  return { streakMult, streakDays, freezes: streak.freezes, comboActive, comboMult, comboCount };
}

export function useProgram() {
  const today = useToday();
  const startDate = useStore((s) => s.settings.startDate);
  const day = Math.max(1, programDay(startDate, today));
  const clamped = Math.min(PROGRAM_DAYS, day);
  return {
    today,
    startDate,
    day,
    clamped,
    phase: phaseFor(clamped),
    finished: day > PROGRAM_DAYS,
    endDate: addDays(startDate, PROGRAM_DAYS - 1),
  };
}
