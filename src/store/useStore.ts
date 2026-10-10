import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { checkBadges } from '@/lib/badges';
import { dayKeyFor, formatHHMM, parseHHMM, toDayKey, uid, weekKeyFor } from '@/lib/dates';
import { allWeeklyQuotasMet, type CompletionIndex } from '@/lib/scheduling';
import {
  BONUS,
  advanceCombo,
  bonusPoints,
  comboMultiplier,
  computePoints,
  evaluateStreak,
  isPerfectDay,
  isPerfectNight,
  levelFor,
  streakMultiplier,
  timingMultiplier,
  totalScore,
  type DayBonuses,
  type WeekBonuses,
} from '@/lib/scoring';
import { SEED_ITEMS, SEED_TEMPLATES, defaultSettings } from '@/lib/seed';
import {
  BADGES,
  type BadgeId,
  type Checkin,
  type ComboState,
  type Completion,
  type CustomFood,
  type FoodEntry,
  type Item,
  type LoggedExercise,
  type NutritionDay,
  type Settings,
  type StreakState,
  type WorkoutSession,
  type WorkoutTemplate,
} from '@/lib/types';
import { useFx } from './fx';
import { appStorage } from './storage';

export const SCHEMA_VERSION = 2;

export interface DataState {
  settings: Settings;
  items: Item[];
  completions: CompletionIndex;
  dayBonuses: DayBonuses;
  weekBonuses: WeekBonuses;
  streak: StreakState;
  combo: ComboState;
  nutrition: Record<string, NutritionDay>;
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  checkins: Checkin[];
  badges: Partial<Record<BadgeId, number>>;
  lastLevelSeen: number;
  dismissedTips: Record<string, true>;
  notificationsGranted: boolean;
  customFoods: CustomFood[];
}

export interface Actions {
  hydrated: boolean;
  setHydrated: (v: boolean) => void;

  tick: (now?: number) => void;
  completeItem: (itemId: string, now?: number) => Completion | null;
  uncompleteItem: (itemId: string, date: string) => void;

  addItem: (item: Omit<Item, 'id' | 'order'>) => Item;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  reorderItems: (ids: string[]) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  setNotificationsGranted: (v: boolean) => void;
  completeOnboarding: (startDate: string, bedtime: string, injectionTime: string) => void;

  addNutrition: (delta: Partial<NutritionDay>, now?: number) => void;
  setNutrition: (date: string, value: NutritionDay) => void;
  addFoodEntry: (entry: Omit<FoodEntry, 'id' | 'at'>, opts?: { shake?: boolean }, now?: number) => void;
  removeFoodEntry: (date: string, entryId: string) => void;
  addCustomFood: (food: Omit<CustomFood, 'id'>) => CustomFood;
  removeCustomFood: (id: string) => void;

  startSession: (templateId: string, now?: number) => WorkoutSession;
  updateActiveSession: (exercises: LoggedExercise[]) => void;
  discardActiveSession: () => void;
  finishSession: (now?: number) => WorkoutSession | null;
  updateTemplate: (id: string, patch: Partial<WorkoutTemplate>) => void;

  addCheckin: (c: Omit<Checkin, 'id' | 'at' | 'weekKey' | 'date'>, now?: number) => Checkin;

  dismissTip: (date: string) => void;
  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
  resetProgram: () => void;
}

export type Store = DataState & Actions;

function initialData(startDate = toDayKey(new Date())): DataState {
  return {
    settings: defaultSettings(startDate),
    items: SEED_ITEMS.map((i) => ({ ...i })),
    completions: {},
    dayBonuses: {},
    weekBonuses: {},
    streak: { days: 0, freezes: 0, evaluatedThrough: null, freezesEarnedAtDays: 0 },
    combo: { count: 0, lastAt: null },
    nutrition: {},
    templates: SEED_TEMPLATES.map((t) => ({ ...t, exercises: t.exercises.map((e) => ({ ...e })) })),
    sessions: [],
    activeSession: null,
    checkins: [],
    badges: {},
    lastLevelSeen: 0,
    dismissedTips: {},
    notificationsGranted: false,
    customFoods: [],
  };
}

const DATA_KEYS: (keyof DataState)[] = [
  'settings',
  'items',
  'completions',
  'dayBonuses',
  'weekBonuses',
  'streak',
  'combo',
  'nutrition',
  'templates',
  'sessions',
  'activeSession',
  'checkins',
  'badges',
  'lastLevelSeen',
  'dismissedTips',
  'notificationsGranted',
  'customFoods',
];

function pickData(s: Store): DataState {
  const out = {} as DataState;
  for (const k of DATA_KEYS) (out as unknown as Record<string, unknown>)[k] = s[k];
  return out;
}

/** Recompute Perfect Day / Perfect Night / Weekly Quest bonuses for a day after a completion change. */
function recomputeBonuses(state: DataState, date: string): Pick<DataState, 'dayBonuses' | 'weekBonuses'> {
  const sMult = streakMultiplier(state.streak.days);
  const day = { ...(state.dayBonuses[date] ?? {}) };
  const fx = useFx.getState();

  const perfectDay = isPerfectDay(state.items, state.completions, date);
  if (perfectDay && day.perfectDay === undefined) {
    day.perfectDay = bonusPoints(BONUS.perfectDay, sMult);
    fx.pop({ base: BONUS.perfectDay, mult: sMult, points: day.perfectDay, label: 'PERFECT DAY', big: true, title: 'Perfect Day!' });
  } else if (!perfectDay && day.perfectDay !== undefined) {
    delete day.perfectDay;
  }

  const perfectNight = isPerfectNight(state.items, state.completions, date, state.settings);
  if (perfectNight && day.perfectNight === undefined) {
    day.perfectNight = bonusPoints(BONUS.perfectNight, sMult);
    fx.pop({ base: BONUS.perfectNight, mult: sMult, points: day.perfectNight, label: 'PERFECT NIGHT', big: true, title: 'Perfect Night!' });
  } else if (!perfectNight && day.perfectNight !== undefined) {
    delete day.perfectNight;
  }

  const dayBonuses = { ...state.dayBonuses };
  if (Object.keys(day).length === 0) delete dayBonuses[date];
  else dayBonuses[date] = day;

  const wk = weekKeyFor(date);
  const week = { ...(state.weekBonuses[wk] ?? {}) };
  const questMet = allWeeklyQuotasMet(state.items, state.completions, date);
  if (questMet && week.quest === undefined) {
    week.quest = bonusPoints(BONUS.quest, sMult);
    fx.pop({ base: BONUS.quest, mult: sMult, points: week.quest, label: 'WEEKLY QUEST', big: true, title: 'Weekly Quest Complete!' });
  } else if (!questMet && week.quest !== undefined) {
    delete week.quest;
  }
  const weekBonuses = { ...state.weekBonuses };
  if (Object.keys(week).length === 0) delete weekBonuses[wk];
  else weekBonuses[wk] = week;

  return { dayBonuses, weekBonuses };
}

/** Award newly-earned badges and detect level-ups. Returns the patch to merge. */
function postChange(state: DataState, now: number): Partial<DataState> {
  const today = dayKeyFor(new Date(now));
  const fx = useFx.getState();
  const patch: Partial<DataState> = {};

  const newBadges = checkBadges({
    items: state.items,
    index: state.completions,
    streak: state.streak,
    combo: state.combo,
    dayBonuses: state.dayBonuses,
    sessions: state.sessions,
    startDate: state.settings.startDate,
    today,
    earned: state.badges,
  });
  if (newBadges.length > 0) {
    patch.badges = { ...state.badges };
    for (const id of newBadges) {
      patch.badges[id] = now;
      const def = BADGES.find((b) => b.id === id);
      if (def) fx.showBadge(def);
    }
  }

  const total = totalScore(state.completions, state.dayBonuses, state.weekBonuses);
  const lvl = levelFor(total).level;
  if (lvl.index > state.lastLevelSeen) {
    patch.lastLevelSeen = lvl.index;
    fx.showLevelUp(lvl);
  }
  return patch;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),
      hydrated: false,
      setHydrated: (v) => set({ hydrated: v }),

      tick: (now = Date.now()) => {
        const s = get();
        const today = dayKeyFor(new Date(now));
        const streak = evaluateStreak(s.streak, s.items, s.completions, s.settings.startDate, today);
        const changed =
          streak.days !== s.streak.days ||
          streak.freezes !== s.streak.freezes ||
          streak.evaluatedThrough !== s.streak.evaluatedThrough;
        const next: DataState = { ...pickData(s), streak };
        const patch = postChange(next, now);
        if (changed || Object.keys(patch).length > 0) set({ streak, ...patch });
      },

      completeItem: (itemId, now = Date.now()) => {
        get().tick(now);
        const s = get();
        const item = s.items.find((i) => i.id === itemId);
        if (!item) return null;
        const at = new Date(now);
        const date = dayKeyFor(at);
        if (s.completions[date]?.[itemId]) return null;

        const streakMult = streakMultiplier(s.streak.days);
        const timing = timingMultiplier(item, at, s.settings);
        const combo = advanceCombo(s.combo, now);
        const comboMult = comboMultiplier(combo.count);
        const points = computePoints(item.basePoints, streakMult, timing.mult, comboMult);
        const completion: Completion = {
          itemId,
          date,
          at: now,
          points,
          base: item.basePoints,
          streakMult,
          timingMult: timing.mult,
          comboMult,
          timingLabel: timing.label,
        };
        const completions: CompletionIndex = {
          ...s.completions,
          [date]: { ...(s.completions[date] ?? {}), [itemId]: completion },
        };
        const withCompletion: DataState = { ...pickData(s), completions, combo };
        const bonuses = recomputeBonuses(withCompletion, date);
        const next: DataState = { ...withCompletion, ...bonuses };
        const patch = postChange(next, now);
        set({ completions, combo, ...bonuses, ...patch });

        useFx.getState().pop({
          base: item.basePoints,
          mult: Math.round(streakMult * timing.mult * comboMult * 100) / 100,
          points,
          label: timing.label,
          big: false,
        });
        return completion;
      },

      uncompleteItem: (itemId, date) => {
        const s = get();
        const removed = s.completions[date]?.[itemId];
        if (!removed) return;
        const day = { ...s.completions[date] };
        delete day[itemId];
        const completions = { ...s.completions };
        if (Object.keys(day).length === 0) delete completions[date];
        else completions[date] = day;
        // Undoing the most recent completion breaks the combo chain so check/uncheck can't farm it.
        const combo: ComboState = s.combo.lastAt === removed.at ? { count: 0, lastAt: null } : s.combo;
        const next: DataState = { ...pickData(s), completions, combo };
        const bonuses = recomputeBonuses(next, date);
        set({ completions, combo, ...bonuses });
      },

      addItem: (item) => {
        const s = get();
        const order = s.items.reduce((m, i) => Math.max(m, i.order), -1) + 1;
        const created: Item = { ...item, id: uid(), order };
        set({ items: [...s.items, created] });
        return created;
      },
      updateItem: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch, id } : i)) })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      reorderItems: (ids) =>
        set((s) => {
          const pos = new Map(ids.map((id, i) => [id, i]));
          return {
            items: s.items.map((i) => ({ ...i, order: pos.get(i.id) ?? i.order })),
          };
        }),

      updateSettings: (patch) =>
        set((s) => {
          const settings: Settings = { ...s.settings, ...patch };
          const notifications = { ...settings.notifications };
          // Shift injection-related reminders with the injection time.
          if (patch.injectionTime && patch.injectionTime !== s.settings.injectionTime) {
            const delta = parseHHMM(patch.injectionTime) - parseHHMM(s.settings.injectionTime);
            for (const k of ['injPrep', 'injections', 'injFollowup'] as const) {
              notifications[k] = { ...notifications[k], time: formatHHMM(parseHHMM(notifications[k].time) + delta) };
            }
          }
          // Shift bedtime-related reminders with bedtime.
          if (patch.bedtime && patch.bedtime !== s.settings.bedtime) {
            const delta = parseHHMM(patch.bedtime) - parseHHMM(s.settings.bedtime);
            for (const k of ['bedtimeRoutine', 'lightsOut'] as const) {
              notifications[k] = { ...notifications[k], time: formatHHMM(parseHHMM(notifications[k].time) + delta) };
            }
          }
          return { settings: { ...settings, notifications: patch.notifications ?? notifications } };
        }),
      setNotificationsGranted: (v) => set({ notificationsGranted: v }),
      completeOnboarding: (startDate, bedtime, injectionTime) => {
        get().updateSettings({ startDate, bedtime, injectionTime });
        set((s) => ({ settings: { ...s.settings, onboarded: true } }));
      },

      addNutrition: (delta, now = Date.now()) => {
        const s = get();
        const date = dayKeyFor(new Date(now));
        const cur = s.nutrition[date] ?? { calories: 0, protein: 0, waterMl: 0 };
        const value: NutritionDay = {
          calories: Math.max(0, cur.calories + (delta.calories ?? 0)),
          protein: Math.max(0, cur.protein + (delta.protein ?? 0)),
          waterMl: Math.max(0, cur.waterMl + (delta.waterMl ?? 0)),
        };
        get().setNutrition(date, value);
      },
      addFoodEntry: (entry, opts = {}, now = Date.now()) => {
        const s = get();
        const date = dayKeyFor(new Date(now));
        const cur = s.nutrition[date] ?? { calories: 0, protein: 0, waterMl: 0, entries: [] };
        const full: FoodEntry = { ...entry, id: uid(), at: now };
        get().setNutrition(date, {
          calories: Math.max(0, cur.calories + entry.calories),
          protein: Math.max(0, Math.round((cur.protein + entry.protein) * 10) / 10),
          waterMl: cur.waterMl,
          entries: [...(cur.entries ?? []), full],
        });
        if (opts.shake) {
          const shakeItem = get().items.find((i) => i.link === 'shake');
          if (shakeItem && !get().completions[date]?.[shakeItem.id]) get().completeItem(shakeItem.id, now);
        }
      },
      removeFoodEntry: (date, entryId) => {
        const s = get();
        const cur = s.nutrition[date];
        const entry = cur?.entries?.find((e) => e.id === entryId);
        if (!cur || !entry) return;
        set({
          nutrition: {
            ...s.nutrition,
            [date]: {
              ...cur,
              calories: Math.max(0, cur.calories - entry.calories),
              protein: Math.max(0, Math.round((cur.protein - entry.protein) * 10) / 10),
              entries: (cur.entries ?? []).filter((e) => e.id !== entryId),
            },
          },
        });
      },
      addCustomFood: (food) => {
        const created: CustomFood = { ...food, id: uid() };
        set((s) => ({ customFoods: [...s.customFoods, created] }));
        return created;
      },
      removeCustomFood: (id) => set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id) })),

      setNutrition: (date, value) => {
        const s = get();
        set({ nutrition: { ...s.nutrition, [date]: value } });
        // Auto-check linked items when targets are hit (today only).
        const today = dayKeyFor(new Date());
        if (date !== today) return;
        const t = s.settings;
        const hit: Record<string, boolean> = {
          protein: value.protein >= t.proteinTarget,
          calories: value.calories >= t.calorieTarget,
          water: value.waterMl >= t.waterTargetMl,
        };
        for (const it of s.items) {
          if (it.link && hit[it.link] && !s.completions[today]?.[it.id]) get().completeItem(it.id);
        }
      },

      startSession: (templateId, now = Date.now()) => {
        const s = get();
        const t = s.templates.find((x) => x.id === templateId) ?? s.templates[0];
        const session: WorkoutSession = {
          id: uid(),
          date: dayKeyFor(new Date(now)),
          templateId: t.id,
          templateName: t.name,
          startedAt: now,
          finishedAt: null,
          exercises: t.exercises.map((e) => ({ exerciseId: e.id, name: e.name, sets: [] })),
          prs: [],
        };
        set({ activeSession: session });
        return session;
      },
      updateActiveSession: (exercises) =>
        set((s) => (s.activeSession ? { activeSession: { ...s.activeSession, exercises } } : {})),
      discardActiveSession: () => set({ activeSession: null }),
      finishSession: (now = Date.now()) => {
        const s = get();
        const active = s.activeSession;
        if (!active) return null;
        const exercises = active.exercises.filter((e) => e.sets.length > 0);
        if (exercises.length === 0) {
          set({ activeSession: null });
          return null;
        }
        // PRs: best set (weight, then reps) beats any previous session's best for that exercise.
        const prs: string[] = [];
        for (const ex of exercises) {
          const best = bestSet(ex.sets);
          if (!best) continue;
          const prevBest = previousBest(s.sessions, ex.exerciseId);
          if (!prevBest) continue;
          if (best.weight > prevBest.weight || (best.weight === prevBest.weight && best.reps > prevBest.reps)) {
            prs.push(ex.exerciseId);
          }
        }
        const finished: WorkoutSession = { ...active, exercises, finishedAt: now, prs };
        set({ sessions: [...s.sessions, finished], activeSession: null });
        const workoutItem = s.items.find((i) => i.link === 'workout');
        if (workoutItem) get().completeItem(workoutItem.id, now);
        else get().tick(now);
        if (prs.length > 0) useFx.getState().showToast(`🏅 ${prs.length} new PR${prs.length > 1 ? 's' : ''}!`);
        return finished;
      },
      updateTemplate: (id, patch) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch, id } : t)) })),

      addCheckin: (c, now = Date.now()) => {
        const s = get();
        const date = dayKeyFor(new Date(now));
        const weekKey = weekKeyFor(date);
        const checkin: Checkin = { ...c, id: uid(), at: now, date, weekKey };
        const checkins = [...s.checkins.filter((x) => x.weekKey !== weekKey), checkin];
        const sMult = streakMultiplier(s.streak.days);
        const week = { ...(s.weekBonuses[weekKey] ?? {}) };
        const first = week.checkin === undefined;
        if (first) week.checkin = bonusPoints(BONUS.checkin, sMult);
        const weekBonuses = { ...s.weekBonuses, [weekKey]: week };
        const next: DataState = { ...pickData(s), checkins, weekBonuses };
        const patch = postChange(next, now);
        set({ checkins, weekBonuses, ...patch });
        if (first) {
          useFx.getState().pop({ base: BONUS.checkin, mult: sMult, points: week.checkin ?? 0, label: 'BOSS FIGHT', big: true, title: 'Check-in Complete!' });
        }
        return checkin;
      },

      dismissTip: (date) => set((s) => ({ dismissedTips: { ...s.dismissedTips, [date]: true } })),

      exportData: () => {
        const data = pickData(get());
        return JSON.stringify({ app: 'glow-up-60', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
      },
      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          const data = parsed?.data ?? parsed;
          if (!data || !Array.isArray(data.items) || !data.settings) {
            return { ok: false, error: 'Not a Glow Up 60 backup file.' };
          }
          const base = initialData(data.settings.startDate);
          const merged: DataState = { ...base, ...data, settings: { ...base.settings, ...data.settings } };
          set(merged);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' };
        }
      },
      resetProgram: () => set({ ...initialData() }),
    }),
    {
      name: 'glow-up-60',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => appStorage),
      migrate: (persisted, version) => {
        const st = persisted as Partial<DataState>;
        if (version < 2 && st && Array.isArray(st.items)) {
          const completions = st.completions ?? {};
          const touched = (id: string) => Object.values(completions).some((d) => !!d[id]);
          let items = st.items.filter((i) => !(i.id === 'mole-check' && !touched('mole-check')));
          if (!items.some((i) => i.link === 'shake')) {
            const shake = SEED_ITEMS.find((i) => i.link === 'shake');
            if (shake) items = [...items, { ...shake, order: items.length }];
          }
          st.items = items;
          if (!st.sessions || st.sessions.length === 0) st.templates = SEED_TEMPLATES.map((t) => ({ ...t }));
          st.customFoods = st.customFoods ?? [];
        }
        if (st?.settings && st.settings.pin === undefined) st.settings.pin = null;
        return st as Store;
      },
      partialize: (s) => pickData(s) as unknown as Store,
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

function bestSet(sets: { reps: number; weight: number }[]) {
  let best: { reps: number; weight: number } | null = null;
  for (const st of sets) {
    if (!best || st.weight > best.weight || (st.weight === best.weight && st.reps > best.reps)) best = st;
  }
  return best;
}

export function previousBest(sessions: WorkoutSession[], exerciseId: string) {
  let best: { reps: number; weight: number } | null = null;
  for (const s of sessions) {
    if (s.finishedAt === null) continue;
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const b = bestSet(ex.sets);
      if (b && (!best || b.weight > best.weight || (b.weight === best.weight && b.reps > best.reps))) best = b;
    }
  }
  return best;
}

/** Last finished session for a template (for "beat this"). */
export function lastSessionFor(sessions: WorkoutSession[], templateId: string): WorkoutSession | null {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].templateId === templateId && sessions[i].finishedAt !== null) return sessions[i];
  }
  return null;
}

/** Next template in A → B → C rotation based on the last finished session. */
export function nextTemplateId(templates: WorkoutTemplate[], sessions: WorkoutSession[]): string {
  if (templates.length === 0) return '';
  const last = [...sessions].reverse().find((s) => s.finishedAt !== null);
  if (!last) return templates[0].id;
  const idx = templates.findIndex((t) => t.id === last.templateId);
  return templates[(idx + 1) % templates.length].id;
}
