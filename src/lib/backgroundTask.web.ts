export const BG_TASK = 'glowup-refresh-notifications';

/** No background execution on the web; reminders are re-armed whenever the app is opened. */
export async function registerBackgroundRefresh(): Promise<boolean> {
  return false;
}
