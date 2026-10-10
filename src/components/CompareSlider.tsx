import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { colors } from '@/theme';

/** Before/after slider: drag the handle to reveal the "after" photo. */
export function CompareSlider({
  before,
  after,
  beforeLabel = 'Day 1',
  afterLabel = 'Latest',
  height = 360,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0.5);
  const start = useSharedValue(0.5);

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = x.value;
    })
    .onUpdate((e) => {
      if (width > 0) x.value = Math.min(0.98, Math.max(0.02, start.value + e.translationX / width));
    });

  const afterStyle = useAnimatedStyle(() => ({ width: x.value * width }));
  const handleStyle = useAnimatedStyle(() => ({ left: x.value * width - 18 }));

  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[styles.wrap, { height }]}>
        <Image source={{ uri: before }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Animated.View style={[styles.afterClip, afterStyle]}>
          <Image source={{ uri: after }} style={{ width: width || 1, height }} contentFit="cover" />
        </Animated.View>
        <Animated.View style={[styles.handle, handleStyle]} pointerEvents="none">
          <View style={styles.handleLine} />
          <View style={styles.knob}>
            <Text style={{ color: '#06110A', fontWeight: '900' }}>⇔</Text>
          </View>
        </Animated.View>
        <Text style={[styles.tag, { left: 10 }]}>{afterLabel}</Text>
        <Text style={[styles.tag, { right: 10 }]}>{beforeLabel}</Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: 18, overflow: 'hidden', backgroundColor: colors.card2 },
  afterClip: { position: 'absolute', left: 0, top: 0, bottom: 0, overflow: 'hidden' },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 36, alignItems: 'center', justifyContent: 'center' },
  handleLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.accent },
  knob: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  tag: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#000000AA',
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
