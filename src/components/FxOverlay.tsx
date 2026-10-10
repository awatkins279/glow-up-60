import * as Haptics from 'expo-haptics';
import { useEffect, useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFx, type ScorePop } from '@/store/fx';
import { colors, font } from '@/theme';

const { width: W, height: H } = Dimensions.get('window');

function Pop({ pop }: { pop: ScorePop }) {
  const remove = useFx((s) => s.removePop);
  const y = useSharedValue(30);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const big = pop.big;
    Haptics.notificationAsync(big ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (big) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    opacity.value = withTiming(1, { duration: 120 });
    scale.value = withSpring(big ? 1.15 : 1, { damping: 10, stiffness: 180 });
    y.value = withSequence(
      withSpring(0, { damping: 12 }),
      withDelay(big ? 1500 : 900, withTiming(-60, { duration: 500, easing: Easing.in(Easing.quad) })),
    );
    opacity.value = withDelay(big ? 1700 : 1100, withTiming(0, { duration: 400 }, (f) => {
      if (f) runOnJS(remove)(pop.id);
    }));
  }, [opacity, pop.big, pop.id, remove, scale, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }, { scale: scale.value }],
  }));

  const mult = pop.mult.toFixed(pop.mult % 1 === 0 ? 1 : 2);
  return (
    <Animated.View style={[styles.pop, pop.big && styles.popBig, style]} pointerEvents="none">
      {pop.title ? <Text style={styles.popTitle}>{pop.title}</Text> : null}
      <Text style={[styles.popMath, pop.big && { fontSize: 20 }]}>
        +{pop.base} × {mult}x = <Text style={styles.popPoints}>{pop.points}</Text>
      </Text>
      {pop.label ? <Text style={[styles.popLabel, pop.label === 'PAST BEDTIME' && { color: colors.red }]}>{pop.label}</Text> : null}
    </Animated.View>
  );
}

const CONFETTI_COLORS = [colors.accent, colors.gold, colors.purple, colors.blue, colors.red, '#fff'];

/** Deterministic pseudo-random in [0, 1) so confetti layout is pure per index. */
function prand(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function ConfettiPiece({ i }: { i: number }) {
  const seed = useMemo(() => ({
    x: prand(i, 1) * W,
    delay: prand(i, 2) * 600,
    rot: prand(i, 3) * 720 - 360,
    size: 6 + prand(i, 4) * 8,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    drift: (prand(i, 5) - 0.5) * 120,
    duration: 2600 + prand(i, 6) * 800,
  }), [i]);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(seed.delay, withTiming(1, { duration: seed.duration, easing: Easing.out(Easing.quad) }));
  }, [seed.delay, seed.duration, t]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: seed.x + seed.drift * t.value },
      { translateY: -40 + (H + 80) * t.value },
      { rotate: `${seed.rot * t.value}deg` },
    ],
    opacity: t.value < 0.85 ? 1 : (1 - t.value) / 0.15,
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, width: seed.size, height: seed.size * 1.6, borderRadius: 2, backgroundColor: seed.color }, style]}
    />
  );
}

export function Confetti({ count = 90 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <ConfettiPiece key={i} i={i} />
      ))}
    </View>
  );
}

function LevelUpModal() {
  const level = useFx((s) => s.levelUp);
  const clear = useFx((s) => s.clearLevelUp);
  useEffect(() => {
    if (!level) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t1 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 150);
    const t2 = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [level]);
  if (!level) return null;
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)} style={styles.levelUp}>
      <Confetti />
      <Pressable style={StyleSheet.absoluteFill} onPress={clear} />
      <Animated.View entering={FadeIn.delay(200).springify()} style={styles.levelCard} pointerEvents="box-none">
        <Text style={styles.levelKicker}>LEVEL UP</Text>
        <Text style={styles.levelTitle}>{level.title}</Text>
        <Text style={styles.levelSub}>Level {level.index + 1} unlocked</Text>
        <Pressable onPress={clear} style={styles.levelBtn}>
          <Text style={styles.levelBtnText}>Let&apos;s go</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

function BadgeToast() {
  const badge = useFx((s) => s.badge);
  const clear = useFx((s) => s.clearBadge);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!badge) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(clear, 3500);
    return () => clearTimeout(t);
  }, [badge, clear]);
  if (!badge) return null;
  return (
    <Animated.View entering={FadeIn.springify()} exiting={FadeOut} style={[styles.toast, { top: insets.top + 8 }]}>
      <Pressable onPress={clear} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontSize: 30 }}>{badge.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.toastKicker}>BADGE UNLOCKED</Text>
          <Text style={styles.toastTitle}>{badge.name}</Text>
          <Text style={styles.toastBody}>{badge.description}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PlainToast() {
  const toast = useFx((s) => s.toast);
  const clear = useFx((s) => s.clearToast);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 2500);
    return () => clearTimeout(t);
  }, [toast, clear]);
  if (!toast) return null;
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.toast, { top: insets.top + 8 }]}>
      <Text style={styles.toastTitle}>{toast}</Text>
    </Animated.View>
  );
}

/** Mount once at the root. Renders score pop-ups, badge toasts and the level-up takeover. */
export function FxOverlay() {
  const pops = useFx((s) => s.pops);
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View pointerEvents="none" style={styles.popLayer}>
        {pops.map((p) => (
          <Pop key={p.id} pop={p} />
        ))}
      </View>
      <BadgeToast />
      <PlainToast />
      <LevelUpModal />
    </View>
  );
}

const styles = StyleSheet.create({
  popLayer: { position: 'absolute', left: 0, right: 0, top: H * 0.34, alignItems: 'center', gap: 8 },
  pop: {
    backgroundColor: '#0B0D12EE',
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  popBig: { borderColor: colors.accent, paddingHorizontal: 26, paddingVertical: 16, shadowColor: colors.accent },
  popTitle: { color: colors.accent, fontFamily: font.display, fontSize: 20, letterSpacing: 1, marginBottom: 4 },
  popMath: { color: colors.text, fontSize: 18, fontFamily: font.display, letterSpacing: 1 },
  popPoints: { color: colors.gold, fontSize: 26 },
  popLabel: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
  levelUp: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#05060AEE', alignItems: 'center', justifyContent: 'center' },
  levelCard: { alignItems: 'center', gap: 6, padding: 32 },
  levelKicker: { color: colors.accent, fontFamily: font.display, letterSpacing: 6, fontSize: 14 },
  levelTitle: { color: colors.gold, fontFamily: font.display, fontSize: 52, textAlign: 'center', letterSpacing: 2, textTransform: 'uppercase' },
  levelSub: { color: colors.text2, fontSize: 16 },
  levelBtn: { marginTop: 24, backgroundColor: colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  levelBtnText: { color: '#06110A', fontWeight: '900', fontSize: 16 },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: `${colors.gold}66`,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  toastKicker: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  toastTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  toastBody: { color: colors.text2, fontSize: 13 },
});
