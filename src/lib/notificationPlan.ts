import { addDays, dateAt, dayKeyFor, format12h, isoWeekday, weekKeyFor } from './dates';
import { dayStatuses, weeklyQuotas, type CompletionIndex, type ItemStatus } from './scheduling';
import type { Checkin, Item, NotifKey, NutritionDay, Settings } from './types';

export interface PlannedNotification {
  id: string;
  key: NotifKey;
  date: Date;
  title: string;
  body: string;
  timeSensitive: boolean;
  data: Record<string, string>;
}

export interface PlanInput {
  settings: Settings;
  items: Item[];
  index: CompletionIndex;
  nutrition: Record<string, NutritionDay>;
  checkins: Checkin[];
  now: Date;
  days?: number;
}

/** iOS silently drops everything past 64 pending local notifications. */
export const MAX_PENDING = 60;

function shortName(name: string): string {
  // "AM skin: cleanse + moisturize + SPF" → "AM skin"
  const cut = name.split(':')[0].split('(')[0].trim();
  return cut.length > 22 ? `${cut.slice(0, 20)}…` : cut;
}

function joinNames(statuses: ItemStatus[], max = 3): string {
  const names = statuses.map((s) => shortName(s.item.name));
  if (names.length <= max) return names.join(' + ');
  return `${names.slice(0, max).join(' + ')} +${names.length - max} more`;
}

export function buildNotificationPlan(input: PlanInput): PlannedNotification[] {
  const { settings, items, index, nutrition, checkins, now } = input;
  const days = input.days ?? 7;
  const n = settings.notifications;
  const today = dayKeyFor(now);
  const out: PlannedNotification[] = [];

  const push = (
    key: NotifKey,
    dayKey: string,
    time: string,
    title: string,
    body: string,
    opts: { timeSensitive?: boolean; data?: Record<string, string> } = {},
  ) => {
    if (!n[key]?.enabled) return;
    const date = dateAt(dayKey, time);
    if (date.getTime() <= now.getTime() + 15_000) return; // already passed
    out.push({
      id: `${key}-${dayKey}`,
      key,
      date,
      title,
      body,
      timeSensitive: opts.timeSensitive ?? false,
      data: { screen: 'today', ...(opts.data ?? {}) },
    });
  };

  for (let d = 0; d < days; d++) {
    const dayKey = addDays(today, d);
    const statuses = dayStatuses(items, index, dayKey);
    const due = statuses.filter((s) => s.due && !s.completed);
    const bySlot = (slot: Item['slot']) => due.filter((s) => s.item.slot === slot);

    // Morning
    const morning = bySlot('morning');
    if (morning.length > 0) {
      push('morning', dayKey, n.morning.time, 'Morning routine ☀️', `${joinNames(morning, 4)}. Early bird = 1.25x.`);
    }

    // Midday: protein + water
    const protein = due.find((s) => s.item.link === 'protein');
    const water = due.find((s) => s.item.link === 'water');
    if (protein || water) {
      const nd = nutrition[dayKey];
      const parts: string[] = [];
      if (protein) parts.push(`${nd?.protein ?? 0}/${settings.proteinTarget}g protein`);
      if (water) parts.push(`${((nd?.waterMl ?? 0) / 1000).toFixed(1)}/${(settings.waterTargetMl / 1000).toFixed(0)}L water`);
      push('midday', dayKey, n.midday.time, 'Midday check 🥤', `Protein + water. You're at ${parts.join(', ')}.`, {
        data: { screen: 'nutrition' },
      });
    }

    // Workout (only if still needed this week and due today)
    const workout = due.find((s) => s.item.link === 'workout');
    if (workout) {
      const left = workout.remaining;
      push('workout', dayKey, n.workout.time, 'Workout today? 🏋️', `${left} left this week${workout.urgent ? ' — MUST DO TODAY' : ''}.`, {
        data: { screen: 'workouts' },
      });
    }

    // Injections
    const inj = due.filter((s) => s.item.category === 'Injections');
    if (inj.length > 0) {
      const list = joinNames(inj, 4);
      push('injPrep', dayKey, n.injPrep.time, 'Night injections in 15 min', `Prep now: ${list}.`, {
        data: { section: 'night' },
      });
      push('injections', dayKey, n.injections.time, '💉 Night injections', `${list}. On-time window = 1.5x.`, {
        timeSensitive: true,
        data: { section: 'night' },
      });
      push('injFollowup', dayKey, n.injFollowup.time, 'Still need injections', `Still need: ${list}. On-time bonus ends now.`, {
        timeSensitive: true,
        data: { section: 'night' },
      });
    }

    // Bedtime routine
    const bedtime = bySlot('bedtime');
    if (bedtime.length > 0) {
      push('bedtimeRoutine', dayKey, n.bedtimeRoutine.time, 'Bedtime routine 🌙', `${joinNames(bedtime, 4)}.`, {
        data: { section: 'bedtime' },
      });
    }

    // Lights out
    const nightLeft = due.filter((s) => s.item.slot === 'night' || s.item.slot === 'bedtime');
    if (nightLeft.length > 0) {
      push(
        'lightsOut',
        dayKey,
        n.lightsOut.time,
        `Lights out by ${format12h(settings.bedtime)}`,
        `${nightLeft.length} item${nightLeft.length === 1 ? '' : 's'} left — finish them for a Perfect Night.`,
        { data: { section: 'bedtime' } },
      );
    }

    // Weekly quota check (Thu + Sat)
    const wd = isoWeekday(dayKey);
    if (wd === 4 || wd === 6) {
      const still = weeklyQuotas(items, index, dayKey).filter((q) => q.remaining > 0);
      if (still.length > 0) {
        const txt = still
          .slice(0, 4)
          .map((q) => `${shortName(q.item.name)} x${q.remaining}`)
          .join(', ');
        push('weeklyQuota', dayKey, n.weeklyQuota.time, 'Weekly quota check 📋', `You still need ${txt}${still.length > 4 ? ' …' : ''} this week.`);
      }
    }

    // Sunday check-in
    if (wd === 7) {
      const wk = weekKeyFor(dayKey);
      const done = checkins.some((c) => c.weekKey === wk);
      if (!done) {
        push('checkin', dayKey, n.checkin.time, 'Weekly check-in 🏆', 'Boss fight time — weigh in, rate skin + energy, snap a photo.', {
          data: { screen: 'checkin' },
        });
      }
    }
  }

  out.sort((a, b) => a.date.getTime() - b.date.getTime());
  return out.slice(0, MAX_PENDING);
}
