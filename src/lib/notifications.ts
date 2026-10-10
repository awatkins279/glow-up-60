import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { buildNotificationPlan, type PlannedNotification } from './notificationPlan';
import type { DataState } from '@/store/useStore';

export const CHANNEL_ID = 'glowup-reminders';

let handlerInstalled = false;

/** Show banners even while the app is in the foreground. Safe to call multiple times. */
export function installNotificationHandler() {
  if (handlerInstalled || Platform.OS === 'web') return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Glow Up reminders',
    description: 'Routine, injection and bedtime reminders',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#39FF88',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

export async function getPermissionStatus(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const p = await Notifications.getPermissionsAsync();
  if (Platform.OS === 'ios') {
    return (
      p.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  }
  return p.granted;
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannel();
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true, allowCriticalAlerts: false },
  });
  if (Platform.OS === 'ios') {
    return (
      p.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
    );
  }
  return p.granted;
}

function toRequest(p: PlannedNotification): Notifications.NotificationRequestInput {
  return {
    identifier: p.id,
    content: {
      title: p.title,
      body: p.body,
      sound: 'default',
      data: { ...p.data, key: p.key },
      ...(Platform.OS === 'ios' ? { interruptionLevel: p.timeSensitive ? 'timeSensitive' : 'active' } : {}),
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID, priority: Notifications.AndroidNotificationPriority.MAX } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: p.date,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  };
}

let inflight: Promise<number> | null = null;

/**
 * Cancel everything and schedule the next 7 days from the current state.
 * Serialised so rapid taps don't interleave cancel/schedule calls.
 */
export function rescheduleAll(state: DataState, now = new Date()): Promise<number> {
  const run = async () => {
    const granted = await getPermissionStatus();
    if (!granted) return 0;
    await ensureChannel();
    const plan = buildNotificationPlan({
      settings: state.settings,
      items: state.items,
      index: state.completions,
      nutrition: state.nutrition,
      checkins: state.checkins,
      now,
    });
    await Notifications.cancelAllScheduledNotificationsAsync();
    let count = 0;
    for (const p of plan) {
      try {
        await Notifications.scheduleNotificationAsync(toRequest(p));
        count++;
      } catch (e) {
        console.warn('schedule failed', p.id, e);
      }
    }
    return count;
  };
  const next = (inflight ?? Promise.resolve(0)).then(run, run);
  inflight = next;
  next.finally(() => {
    if (inflight === next) inflight = null;
  });
  return next;
}

export async function sendTestNotification() {
  if (Platform.OS === 'web') throw new Error('Notifications need a phone (Expo Go or a build).');
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '💉 Test: Night injections',
      body: 'This is what your 8 PM reminder looks like. Tap to open Today → Night.',
      sound: 'default',
      data: { screen: 'today', section: 'night' },
      ...(Platform.OS === 'ios' ? { interruptionLevel: 'timeSensitive' } : {}),
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 3,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  });
}

export async function pendingCount(): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.length;
}
