import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { Rajdhani_600SemiBold, Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { FxOverlay } from '@/components/FxOverlay';
import { LockScreen } from '@/components/LockScreen';
import { registerBackgroundRefresh } from '@/lib/backgroundTask';
import { installNotificationHandler, rescheduleAll } from '@/lib/notifications';
import { useStore } from '@/store/useStore';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
installNotificationHandler();

function routeFromNotification(data: Record<string, unknown> | undefined) {
  const screen = typeof data?.screen === 'string' ? data.screen : 'today';
  const section = typeof data?.section === 'string' ? data.section : undefined;
  switch (screen) {
    case 'nutrition':
      router.navigate('/(tabs)/nutrition');
      break;
    case 'workouts':
      router.navigate('/(tabs)/workouts');
      break;
    case 'checkin':
      router.navigate('/checkin');
      break;
    default:
      router.navigate({ pathname: '/(tabs)', params: section ? { scrollTo: section, t: String(Date.now()) } : {} });
  }
}

export default function RootLayout() {
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);
  const handledResponse = useRef<string | null>(null);
  const [fontsLoaded, fontError] = useFonts({ Rajdhani_600SemiBold, Rajdhani_700Bold, Inter_400Regular, Inter_500Medium, Inter_700Bold });
  const ready = hydrated && (fontsLoaded || !!fontError);
  const pin = useStore((s) => s.settings.pin);
  const [unlocked, setUnlocked] = useState(false);

  // Re-lock whenever the app goes to the background.
  useEffect(() => {
    if (!pin) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') setUnlocked(false);
    });
    return () => sub.remove();
  }, [pin]);

  // Hide splash once storage is loaded.
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Streak evaluation + notification refresh on launch and every foreground.
  useEffect(() => {
    if (!hydrated) return;
    const refresh = () => {
      const s = useStore.getState();
      if (!s.settings.onboarded) return;
      s.tick();
      rescheduleAll(useStore.getState()).catch(() => {});
    };
    refresh();
    registerBackgroundRefresh().catch(() => {});
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') refresh();
    });
    return () => sub.remove();
  }, [hydrated]);

  // Reschedule (debounced) whenever anything that affects reminders changes.
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useStore.subscribe((s, prev) => {
      if (!s.settings.onboarded) return;
      if (
        s.completions === prev.completions &&
        s.items === prev.items &&
        s.settings === prev.settings &&
        s.nutrition === prev.nutrition &&
        s.checkins === prev.checkins &&
        s.notificationsGranted === prev.notificationsGranted
      ) {
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => rescheduleAll(useStore.getState()).catch(() => {}), 800);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [hydrated]);

  // Notification taps → deep-link into the right screen/section (native only).
  useEffect(() => {
    if (!hydrated || !onboarded || Platform.OS === 'web') return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (id === handledResponse.current) return;
      handledResponse.current = id;
      routeFromNotification(response.notification.request.content.data as Record<string, unknown>);
    };
    // Cold start from a tap.
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
    // Taps while running / backgrounded.
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [hydrated, onboarded]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (pin && onboarded && !unlocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <LockScreen pin={pin} onUnlock={() => setUnlocked(true)} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
            <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="workout/[id]" />
            <Stack.Screen name="settings/items" />
            <Stack.Screen name="settings/item" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/templates" />
          </Stack.Protected>
        </Stack>
        <FxOverlay />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
