/**
 * Web reminders. There is no server, so nothing can fire while the site is closed.
 * While the app is open (or installed to the home screen and in the foreground), the
 * next 24 hours of the plan are armed with timers and shown via the Notification API.
 */
import { buildNotificationPlan, type PlannedNotification } from './notificationPlan';
import type { DataState } from '@/store/useStore';

export const CHANNEL_ID = 'glowup-reminders';

let timers: ReturnType<typeof setTimeout>[] = [];
let armed: PlannedNotification[] = [];

const hasNotification = () => typeof window !== 'undefined' && 'Notification' in window;

export function installNotificationHandler() {
  /* no-op on web */
}

export async function ensureChannel() {
  /* no-op on web */
}

export async function getPermissionStatus(): Promise<boolean> {
  return hasNotification() && Notification.permission === 'granted';
}

export async function requestPermission(): Promise<boolean> {
  if (!hasNotification()) return false;
  try {
    const r = await Notification.requestPermission();
    return r === 'granted';
  } catch {
    return false;
  }
}

function show(p: PlannedNotification) {
  if (!hasNotification() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(p.title, { body: p.body, tag: p.id, icon: 'icon-192.png' });
    n.onclick = () => {
      window.focus();
      const section = p.data.section;
      const screen = p.data.screen ?? 'today';
      const path = screen === 'today' ? `/${section ? `?scrollTo=${section}&t=${Date.now()}` : ''}` : screen === 'checkin' ? '/checkin' : `/${screen}`;
      window.location.hash = '';
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      n.close();
    };
  } catch (e) {
    console.warn('notification failed', e);
  }
}

/** Arm timers for the next 24 h of reminders. Called on open, on every change and on foreground. */
export async function rescheduleAll(state: DataState, now = new Date()): Promise<number> {
  for (const t of timers) clearTimeout(t);
  timers = [];
  armed = [];
  if (!(await getPermissionStatus())) return 0;
  const plan = buildNotificationPlan({
    settings: state.settings,
    items: state.items,
    index: state.completions,
    nutrition: state.nutrition,
    checkins: state.checkins,
    now,
    days: 2,
  });
  const horizon = now.getTime() + 24 * 60 * 60 * 1000;
  for (const p of plan) {
    const delay = p.date.getTime() - now.getTime();
    if (delay <= 0 || p.date.getTime() > horizon) continue;
    timers.push(setTimeout(() => show(p), delay));
    armed.push(p);
  }
  return armed.length;
}

export async function sendTestNotification() {
  if (!hasNotification()) throw new Error('This browser cannot show notifications. On iPhone, add the site to your Home Screen first.');
  if (Notification.permission !== 'granted') {
    const ok = await requestPermission();
    if (!ok) throw new Error('Notification permission was not granted.');
  }
  setTimeout(() => {
    show({
      id: 'test',
      key: 'injections',
      date: new Date(),
      title: '💉 Test: Night injections',
      body: 'This is what your 8 PM reminder looks like.',
      timeSensitive: true,
      data: { screen: 'today', section: 'night' },
    });
  }, 3000);
}

export async function pendingCount(): Promise<number> {
  return armed.length;
}
