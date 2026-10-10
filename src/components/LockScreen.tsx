import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from './ui';
import { colors, font } from '@/theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

/** Numeric PIN pad. Used both to unlock the app and to set a new PIN. */
export function PinPad({
  title,
  subtitle,
  length,
  onComplete,
  error,
}: {
  title: string;
  subtitle?: string;
  length: number;
  onComplete: (pin: string) => boolean | void;
  error?: string | null;
}) {
  const [pin, setPin] = useState('');
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (k: string) => {
    Haptics.selectionAsync().catch(() => {});
    if (k === 'del') return setPin((p) => p.slice(0, -1));
    if (!k) return;
    const next = (pin + k).slice(0, length);
    setPin(next);
    if (next.length === length) {
      const ok = onComplete(next);
      if (ok === false) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        shake.set(withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 })));
      }
      setTimeout(() => setPin(''), 150);
    }
  };

  return (
    <View style={{ alignItems: 'center', gap: 22 }}>
      <Ionicons name="lock-closed" size={34} color={colors.accent} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      <Animated.View style={[{ flexDirection: 'row', gap: 14 }, shakeStyle]}>
        {Array.from({ length }, (_, i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
        ))}
      </Animated.View>
      {error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.error}> </Text>}
      <View style={styles.pad}>
        {KEYS.map((k, i) => (
          <Pressable key={i} onPress={() => press(k)} disabled={!k} style={({ pressed }) => [styles.key, !k && { opacity: 0 }, pressed && { backgroundColor: colors.card2 }]}>
            {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={colors.text2} /> : <Text style={styles.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function LockScreen({ pin, onUnlock }: { pin: string; onUnlock: () => void }) {
  const insets = useSafeAreaInsets();
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={[styles.screen, { paddingTop: insets.top + 60 }]}>
      <Backdrop />
      <PinPad
        title="GLOW UP 60"
        subtitle="Enter your PIN"
        length={pin.length}
        error={error}
        onComplete={(entered) => {
          if (entered === pin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            onUnlock();
            return true;
          }
          setError('Wrong PIN');
          return false;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  title: { color: colors.text, fontFamily: font.display, fontSize: 28, letterSpacing: 3 },
  sub: { color: colors.text2, fontFamily: font.body, fontSize: 15, marginTop: -12 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: colors.borderBright },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  error: { color: colors.red, fontFamily: font.bodyMedium, fontSize: 13, height: 18 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 270, justifyContent: 'center', gap: 12 },
  key: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  keyText: { color: colors.text, fontFamily: font.display, fontSize: 30 },
});
