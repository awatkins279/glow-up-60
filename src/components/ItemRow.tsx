import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { formatTime } from '@/lib/dates';
import type { ItemStatus } from '@/lib/scheduling';
import { categoryColors, colors, font, radius } from '@/theme';

export function QuotaPips({ done, quota, color = colors.accent }: { done: number; quota: number; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {Array.from({ length: quota }, (_, i) => (
        <View
          key={i}
          style={{
            width: 10,
            height: 5,
            borderRadius: 2,
            backgroundColor: i < done ? color : 'transparent',
            borderWidth: 1,
            borderColor: i < done ? color : colors.text3,
          }}
        />
      ))}
    </View>
  );
}

export function ItemRow({
  status,
  onToggle,
  onLongPress,
  compact,
}: {
  status: ItemStatus;
  onToggle: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}) {
  const { item, completed, completion, weekly, doneThisWeek, quota, urgent } = status;
  const color = categoryColors[item.category] ?? colors.accent;
  const scale = useSharedValue(1);
  const check = useSharedValue(completed ? 1 : 0);

  useEffect(() => {
    check.value = withSpring(completed ? 1 : 0, { damping: 12, stiffness: 200 });
  }, [completed, check]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: check.value > 0.5 ? colors.accent : 'rgba(9,13,23,0.8)',
    borderColor: check.value > 0.5 ? colors.accent : urgent ? colors.red : colors.borderBright,
    transform: [{ scale: 1 + check.value * 0.08 }],
    shadowOpacity: check.value * 0.6,
  }));
  const iconStyle = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: check.value }] }));

  const handle = () => {
    Haptics.impactAsync(completed ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    scale.set(withSequence(withTiming(0.96, { duration: 70 }), withSpring(1, { damping: 10 })));
    onToggle();
  };

  return (
    <Animated.View style={rowStyle}>
      <Pressable
        onPress={handle}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.row,
          urgent && !completed && styles.rowUrgent,
          completed && styles.rowDone,
          pressed && { opacity: 0.85 },
          compact && { paddingVertical: 10 },
        ]}
      >
        <View style={[styles.accentBar, { backgroundColor: completed ? colors.accent : urgent ? colors.red : color }]} />
        <Animated.View style={[styles.box, boxStyle]}>
          <Animated.View style={iconStyle}>
            <Ionicons name="checkmark" size={22} color="#04110C" />
          </Animated.View>
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.name, completed && styles.nameDone]} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.catText, { color }]}>{item.category.toUpperCase()}</Text>
            {weekly ? <QuotaPips done={doneThisWeek} quota={quota} color={color} /> : null}
            {weekly ? (
              <Text style={styles.meta}>
                {doneThisWeek}/{quota} WK
              </Text>
            ) : null}
            {urgent && !completed ? <Text style={styles.urgent}>MUST DO TODAY</Text> : null}
            {completed && completion ? (
              <Text style={styles.meta}>
                {formatTime(new Date(completion.at))}
                {completion.timingLabel ? ` · ${completion.timingLabel}` : ''}
              </Text>
            ) : null}
            {item.notes ? (
              <Text style={styles.meta} numberOfLines={1}>
                · {item.notes}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {completed && completion ? <Text style={styles.points}>+{completion.points}</Text> : <Text style={styles.base}>{item.basePoints}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(13,18,32,0.88)',
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
    paddingLeft: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  rowUrgent: { borderColor: `${colors.red}77`, backgroundColor: 'rgba(32,12,22,0.9)' },
  rowDone: { backgroundColor: 'rgba(10,30,24,0.9)', borderColor: `${colors.accent}44` },
  box: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  name: { color: colors.text, fontSize: 15.5, fontFamily: font.bodyMedium, flexShrink: 1 },
  nameDone: { color: colors.text2, textDecorationLine: 'line-through' },
  catText: { fontSize: 10, fontFamily: font.display, letterSpacing: 1.4 },
  meta: { color: colors.text3, fontSize: 11.5, fontFamily: font.body },
  urgent: { color: colors.red, fontSize: 10.5, fontFamily: font.display, letterSpacing: 1.4 },
  points: { color: colors.gold, fontFamily: font.display, fontSize: 19, fontVariant: ['tabular-nums'] },
  base: { color: colors.text3, fontFamily: font.display, fontSize: 15, fontVariant: ['tabular-nums'] },
});
