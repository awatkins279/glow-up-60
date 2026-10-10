import type { Item, NotifKey, NotifSetting, Settings, WorkoutTemplate } from './types';

const daily = { kind: 'daily' } as const;
const weekly = (times: number) => ({ kind: 'weekly', times }) as const;

export const SEED_ITEMS: Item[] = [
  { id: 'am-skin', name: 'AM skin: cleanse + moisturize + SPF', category: 'Skin', frequency: daily, slot: 'morning', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 0 },
  { id: 'vitamins', name: 'Vitamins', category: 'Supplements', frequency: daily, slot: 'morning', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 1 },
  { id: 'finasteride', name: 'Finasteride', category: 'Meds', frequency: daily, slot: 'morning', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 2 },
  { id: 'water', name: '3L water', category: 'Nutrition', frequency: daily, slot: 'allday', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 3, link: 'water' },
  { id: 'protein', name: 'Hit protein goal', category: 'Nutrition', frequency: daily, slot: 'allday', basePoints: 20, notes: '', noBackToBack: false, fixedWeekdays: [], order: 4, link: 'protein' },
  { id: 'calories', name: 'Hit calorie goal (eating more)', category: 'Nutrition', frequency: daily, slot: 'allday', basePoints: 20, notes: '', noBackToBack: false, fixedWeekdays: [], order: 5, link: 'calories' },
  { id: 'workout', name: 'Workout', category: 'Training', frequency: weekly(3), slot: 'evening', basePoints: 50, notes: '', noBackToBack: true, fixedWeekdays: [], order: 6, link: 'workout' },
  { id: 'tanning', name: 'Tanning bed', category: 'Skin', frequency: weekly(3), slot: 'anytime', basePoints: 15, notes: '', noBackToBack: false, fixedWeekdays: [], order: 7, link: 'tanning' },
  { id: 'melanotan', name: 'Melanotan 2', category: 'Injections', frequency: weekly(3), slot: 'night', basePoints: 20, notes: '', noBackToBack: true, fixedWeekdays: [], order: 8 },
  { id: 'tesamorelin', name: 'Tesamorelin', category: 'Injections', frequency: weekly(5), slot: 'night', basePoints: 25, notes: '', noBackToBack: false, fixedWeekdays: [], order: 9 },
  { id: 'glutathione', name: 'Glutathione', category: 'Injections', frequency: weekly(2), slot: 'night', basePoints: 20, notes: '', noBackToBack: true, fixedWeekdays: [], order: 10 },
  { id: 'pm-skin', name: 'PM skin: cleanse + moisturize', category: 'Skin', frequency: daily, slot: 'bedtime', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 11 },
  { id: 'tretinoin', name: 'Tretinoin', category: 'Skin', frequency: weekly(3), slot: 'bedtime', basePoints: 20, notes: '', noBackToBack: true, fixedWeekdays: [], order: 12, link: 'tretinoin' },
  { id: 'lash-serum', name: 'Eyelash & brow serum', category: 'Skin', frequency: daily, slot: 'bedtime', basePoints: 10, notes: '', noBackToBack: false, fixedWeekdays: [], order: 13 },
  { id: 'in-bed', name: 'In bed by 11 PM', category: 'Recovery', frequency: daily, slot: 'bedtime', basePoints: 25, notes: '', noBackToBack: false, fixedWeekdays: [], order: 14 },
  { id: 'sleep', name: 'Slept 7+ hrs (log next morning)', category: 'Recovery', frequency: daily, slot: 'morning', basePoints: 15, notes: '', noBackToBack: false, fixedWeekdays: [], order: 15 },
  { id: 'protein-shake', name: 'Daily protein shake', category: 'Nutrition', frequency: daily, slot: 'allday', basePoints: 15, notes: '', noBackToBack: false, fixedWeekdays: [], order: 6, link: 'shake' },
];

/** Home setup: chest bench, ab bench, dumbbells, kettlebells. */
export const SEED_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'day-a',
    name: 'Day A · Chest + Shoulders',
    exercises: [
      { id: 'a-db-bench', name: 'Dumbbell Bench Press' },
      { id: 'a-incline', name: 'Incline Dumbbell Press' },
      { id: 'a-ohp', name: 'Seated Dumbbell Shoulder Press' },
      { id: 'a-lateral', name: 'Dumbbell Lateral Raise' },
      { id: 'a-situp', name: 'Decline Sit-ups (ab bench)' },
    ],
  },
  {
    id: 'day-b',
    name: 'Day B · Legs + Back',
    exercises: [
      { id: 'b-goblet', name: 'Kettlebell Goblet Squat' },
      { id: 'b-swing', name: 'Kettlebell Swing' },
      { id: 'b-rdl', name: 'Dumbbell Romanian Deadlift' },
      { id: 'b-row', name: 'One-arm Dumbbell Row (bench)' },
      { id: 'b-lunge', name: 'Dumbbell Reverse Lunge' },
    ],
  },
  {
    id: 'day-c',
    name: 'Day C · Arms + Core',
    exercises: [
      { id: 'c-curl', name: 'Dumbbell Curl' },
      { id: 'c-skull', name: 'Skull Crushers (bench)' },
      { id: 'c-kbpress', name: 'Kettlebell Clean & Press' },
      { id: 'c-crunch', name: 'Decline Crunch (ab bench)' },
      { id: 'c-twist', name: 'Kettlebell Russian Twist' },
      { id: 'c-plank', name: 'Plank (seconds)' },
    ],
  },
];

export const DEFAULT_NOTIFICATIONS: Record<NotifKey, NotifSetting> = {
  morning: { enabled: true, time: '08:30' },
  midday: { enabled: true, time: '13:00' },
  workout: { enabled: true, time: '17:00' },
  injPrep: { enabled: true, time: '19:45' },
  injections: { enabled: true, time: '20:00' },
  injFollowup: { enabled: true, time: '20:30' },
  bedtimeRoutine: { enabled: true, time: '21:45' },
  lightsOut: { enabled: true, time: '22:30' },
  weeklyQuota: { enabled: true, time: '18:00' },
  checkin: { enabled: true, time: '19:00' },
};

export const NOTIF_LABELS: Record<NotifKey, string> = {
  morning: 'Morning routine',
  midday: 'Midday check (protein + water)',
  workout: 'Workout nudge',
  injPrep: 'Injection prep (15 min before)',
  injections: 'Night injections',
  injFollowup: 'Injection follow-up',
  bedtimeRoutine: 'Bedtime routine',
  lightsOut: 'Lights out',
  weeklyQuota: 'Weekly quota check (Thu + Sat)',
  checkin: 'Weekly check-in (Sun)',
};

export function defaultSettings(startDate: string): Settings {
  return {
    startDate,
    bedtime: '23:00',
    injectionTime: '20:00',
    notifications: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS)),
    onboarded: false,
    calorieTarget: 3000,
    proteinTarget: 180,
    waterTargetMl: 3000,
    pin: null,
  };
}
