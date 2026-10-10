import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { rescheduleAll } from './notifications';
import { useStore } from '@/store/useStore';

export const BG_TASK = 'glowup-refresh-notifications';

// Must be defined in global scope so it runs when the app is not open.
if (Platform.OS !== 'web') TaskManager.defineTask(BG_TASK, async () => {
  try {
    await useStore.persist.rehydrate();
    const state = useStore.getState();
    if (!state.settings.onboarded) return BackgroundTask.BackgroundTaskResult.Success;
    state.tick();
    await rescheduleAll(useStore.getState());
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('background refresh failed', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh() {
  if (Platform.OS === 'web') return false;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false;
    const already = await TaskManager.isTaskRegisteredAsync(BG_TASK);
    if (!already) {
      // Floor of 6 hours; the OS decides the real cadence (usually overnight).
      await BackgroundTask.registerTaskAsync(BG_TASK, { minimumInterval: 60 * 6 });
    }
    return true;
  } catch (e) {
    console.warn('background task registration failed', e);
    return false;
  }
}
