export type Slot = 'morning' | 'allday' | 'anytime' | 'evening' | 'night' | 'bedtime';

export const SLOT_ORDER: Slot[] = ['morning', 'allday', 'anytime', 'evening', 'night', 'bedtime'];

export const SLOT_LABELS: Record<Slot, string> = {
  morning: 'Morning',
  allday: 'All Day',
  anytime: 'Anytime',
  evening: 'Evening',
  night: 'Night',
  bedtime: 'Bedtime',
};

export type Category =
  | 'Skin'
  | 'Supplements'
  | 'Meds'
  | 'Nutrition'
  | 'Training'
  | 'Injections'
  | 'Recovery'
  | 'Health';

export const CATEGORIES: Category[] = [
  'Skin',
  'Supplements',
  'Meds',
  'Nutrition',
  'Training',
  'Injections',
  'Recovery',
  'Health',
];

export type Frequency = { kind: 'daily' } | { kind: 'weekly'; times: number };

/** Special hooks so other features can find an item even after it is renamed. */
export type ItemLink = 'workout' | 'water' | 'protein' | 'calories' | 'tretinoin' | 'tanning' | 'shake';

export interface Item {
  id: string;
  name: string;
  category: Category;
  frequency: Frequency;
  slot: Slot;
  basePoints: number;
  notes: string;
  noBackToBack: boolean;
  /** ISO weekdays, 1 = Monday … 7 = Sunday. Empty = any day. */
  fixedWeekdays: number[];
  order: number;
  link?: ItemLink;
}

export interface Completion {
  itemId: string;
  /** Day key YYYY-MM-DD (with the 4 AM rollover applied). */
  date: string;
  /** Epoch ms. */
  at: number;
  points: number;
  base: number;
  streakMult: number;
  timingMult: number;
  comboMult: number;
  timingLabel: string | null;
}

export type DayBonusKey = 'perfectDay' | 'perfectNight';
export type WeekBonusKey = 'quest' | 'checkin';

export interface StreakState {
  /** Consecutive qualifying days, evaluated through `evaluatedThrough` (yesterday or earlier). */
  days: number;
  freezes: number;
  evaluatedThrough: string | null;
  /** Streak length at which the last freeze was granted, so each 7-day milestone pays once. */
  freezesEarnedAtDays: number;
}

export interface ComboState {
  count: number;
  lastAt: number | null;
}

export type NotifKey =
  | 'morning'
  | 'midday'
  | 'workout'
  | 'injPrep'
  | 'injections'
  | 'injFollowup'
  | 'bedtimeRoutine'
  | 'lightsOut'
  | 'weeklyQuota'
  | 'checkin';

export interface NotifSetting {
  enabled: boolean;
  /** HH:mm (24h). */
  time: string;
}

export interface Settings {
  /** YYYY-MM-DD */
  startDate: string;
  /** HH:mm */
  bedtime: string;
  /** HH:mm */
  injectionTime: string;
  notifications: Record<NotifKey, NotifSetting>;
  onboarded: boolean;
  calorieTarget: number;
  proteinTarget: number;
  waterTargetMl: number;
  /** 4–6 digit app lock. null = no lock. */
  pin: string | null;
}

export interface FoodEntry {
  id: string;
  /** What the user typed or the resolved label, e.g. "2 cups full-fat Greek yogurt". */
  label: string;
  calories: number;
  protein: number;
  at: number;
}

export interface CustomFood {
  id: string;
  name: string;
  /** Macros per one serving. */
  servingLabel: string;
  calories: number;
  protein: number;
}

export interface NutritionDay {
  calories: number;
  protein: number;
  waterMl: number;
  entries?: FoodEntry[];
}

export interface Exercise {
  id: string;
  name: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface LoggedSet {
  reps: number;
  weight: number;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  templateId: string;
  templateName: string;
  startedAt: number;
  finishedAt: number | null;
  exercises: LoggedExercise[];
  prs: string[];
}

export interface Checkin {
  id: string;
  date: string;
  weekKey: string;
  weight: number | null;
  skin: number;
  energy: number;
  notes: string;
  photos: string[];
  at: number;
}

export type BadgeId =
  | 'first_workout'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'max_multiplier'
  | 'combo_king'
  | 'night_owl'
  | 'protein_machine'
  | 'skin_discipline'
  | 'halfway'
  | 'glow_complete';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  emoji: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_workout', name: 'First Workout', description: 'Logged your first workout', emoji: '🏋️' },
  { id: 'streak_7', name: '7-Day Streak', description: 'Seven streak days in a row', emoji: '🔥' },
  { id: 'streak_14', name: '14-Day Streak', description: 'Two weeks of streak days', emoji: '🔥' },
  { id: 'streak_30', name: '30-Day Streak', description: 'A full month of streak days', emoji: '🌋' },
  { id: 'max_multiplier', name: 'Max Multiplier', description: 'Hit the 3.0x streak multiplier', emoji: '⚡' },
  { id: 'combo_king', name: 'Combo King', description: 'Chained a 5+ combo', emoji: '👑' },
  { id: 'night_owl', name: 'Night Owl Reformed', description: '7 perfect nights in a row', emoji: '🦉' },
  { id: 'protein_machine', name: 'Protein Machine', description: 'Protein goal 7 days straight', emoji: '🥩' },
  { id: 'skin_discipline', name: 'Skin Discipline', description: 'Every skin item for a full week', emoji: '✨' },
  { id: 'halfway', name: 'Halfway', description: 'Reached Day 30', emoji: '🏁' },
  { id: 'glow_complete', name: 'Glow Up Complete', description: 'Finished all 60 days', emoji: '🏆' },
];

export interface LevelDef {
  index: number;
  title: string;
  minScore: number;
}

export const LEVELS: LevelDef[] = [
  { index: 0, title: 'Rookie', minScore: 0 },
  { index: 1, title: 'Grinder', minScore: 1500 },
  { index: 2, title: 'Locked In', minScore: 5000 },
  { index: 3, title: 'Disciplined', minScore: 10000 },
  { index: 4, title: 'Glow Mode', minScore: 18000 },
  { index: 5, title: 'Main Character', minScore: 30000 },
];

export const PROGRAM_DAYS = 60;
