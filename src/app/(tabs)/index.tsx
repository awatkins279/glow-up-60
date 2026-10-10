import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemRow } from '@/components/ItemRow';
import { ProgressRing } from '@/components/ProgressRing';
import { Backdrop, Card, Pill, Row, Small } from '@/components/ui';
import type { ItemStatus } from '@/lib/scheduling';
import { useMultipliers, useProgram, useScores, useTodayBoard } from '@/lib/selectors';
import { SLOT_LABELS, type Slot } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, font, space } from '@/theme';

interface Section {
  key: string;
  title: string;
  data: ItemStatus[];
  urgent?: boolean;
  collapsed?: boolean;
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ scrollTo?: string; t?: string }>();
  const listRef = useRef<SectionList<ItemStatus, Section>>(null);
  const { today, urgent, groups, doneForWeek, resting, progress } = useTodayBoard();
  const { todayScore, week, total, personalBest, level } = useScores();
  const mult = useMultipliers();
  const program = useProgram();
  const completeItem = useStore((s) => s.completeItem);
  const uncompleteItem = useStore((s) => s.uncompleteItem);
  const dismissedTips = useStore((s) => s.dismissedTips);
  const dismissTip = useStore((s) => s.dismissTip);
  const [showDone, setShowDone] = useState(false);
  const [showResting, setShowResting] = useState(false);

  const sections: Section[] = [];
  if (urgent.length > 0) sections.push({ key: 'urgent', title: 'Must do today', data: urgent, urgent: true });
  for (const g of groups) sections.push({ key: g.slot, title: SLOT_LABELS[g.slot], data: g.items });
  if (doneForWeek.length > 0) sections.push({ key: 'done', title: `Done this week ✓ (${doneForWeek.length})`, data: showDone ? doneForWeek : [], collapsed: !showDone });
  if (resting.length > 0) sections.push({ key: 'resting', title: `Not today (${resting.length})`, data: showResting ? resting : [], collapsed: !showResting });

  // Deep link from the 8 PM notification: scroll to the Night section.
  useEffect(() => {
    if (!params.scrollTo) return;
    const idx = sections.findIndex((s) => s.key === params.scrollTo);
    if (idx < 0) return;
    const t = setTimeout(() => {
      listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, viewOffset: 12, animated: true });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.scrollTo, params.t]);

  const toggle = (s: ItemStatus) => {
    if (s.completed) uncompleteItem(s.item.id, today);
    else completeItem(s.item.id);
  };

  const tretTan =
    !dismissedTips[today] &&
    groups.some((g) => g.items.some((s) => s.item.link === 'tretinoin' && s.completed)) &&
    groups.some((g) => g.items.some((s) => s.item.link === 'tanning' && s.completed));

  const multTotal = Math.round(mult.streakMult * mult.comboMult * 100) / 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Backdrop />
      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(s) => s.item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: insets.top + 8, paddingBottom: 120 }}
        onScrollToIndexFailed={() => {}}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.day}>
                  Day {program.clamped}
                  <Text style={{ color: colors.text3 }}> / 60</Text>
                </Text>
                <Row>
                  <Pill color={colors.purple}>{program.phase.toUpperCase()}</Pill>
                  {program.finished ? <Pill color={colors.gold}>COMPLETE 🏆</Pill> : null}
                </Row>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Row style={{ gap: 4 }}>
                  <Text style={{ fontSize: 22 }}>🔥</Text>
                  <Text style={styles.streak}>{mult.streakDays}</Text>
                </Row>
                {mult.freezes > 0 ? <Small>❄️ {mult.freezes} freeze{mult.freezes > 1 ? 's' : ''}</Small> : null}
              </View>
            </Row>

            <Card style={{ gap: 6, paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={styles.level}>
                  LV {level.level.index + 1} · {level.level.title}
                </Text>
                <Text style={styles.xp}>
                  {total}
                  {level.next ? ` / ${level.next.minScore}` : ' · MAX'}
                </Text>
              </Row>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${Math.max(2, level.progress * 100)}%` }]} />
              </View>
            </Card>

            <Card glow={progress.percent >= 1} style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
              <ProgressRing progress={progress.percent} size={120} stroke={11} color={progress.percent >= 1 ? colors.gold : colors.accent}>
                <Text style={styles.ringPct}>{Math.round(progress.percent * 100)}%</Text>
                <Small>
                  {progress.done}/{progress.total}
                </Small>
              </ProgressRing>
              <View style={{ flex: 1, gap: 4 }}>
                <Small style={{ letterSpacing: 2, fontFamily: font.displayMedium }}>TODAY&apos;S SCORE</Small>
                <Text style={styles.score}>{todayScore}</Text>
                {personalBest ? <Pill color={colors.gold}>🏅 PERSONAL BEST</Pill> : null}
                <Row style={{ gap: 12, marginTop: 4 }}>
                  <View>
                    <Small>Week</Small>
                    <Text style={styles.sub}>{week}</Text>
                  </View>
                  <View>
                    <Small>Total</Small>
                    <Text style={styles.sub}>{total}</Text>
                  </View>
                </Row>
              </View>
            </Card>

            <Row style={{ flexWrap: 'wrap', gap: 6 }}>
              <Pill color={colors.gold}>STREAK {mult.streakMult.toFixed(1)}x</Pill>
              {mult.comboActive && mult.comboCount > 0 ? (
                <Animated.View entering={FadeIn} exiting={FadeOut}>
                  <Pill color={colors.accent}>
                    COMBO x{mult.comboCount} — {mult.comboMult.toFixed(2)}x
                  </Pill>
                </Animated.View>
              ) : null}
              <Pill color={colors.text2}>NOW {multTotal.toFixed(2)}x</Pill>
            </Row>

            {tretTan ? (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: `${colors.orange}66` }}>
                  <Text style={{ fontSize: 22 }}>☀️</Text>
                  <Text style={{ color: colors.text2, flex: 1, fontSize: 14 }}>Tretinoin increases burn risk — go easy on tanning.</Text>
                  <Pressable onPress={() => dismissTip(today)} hitSlop={10}>
                    <Ionicons name="close" size={20} color={colors.text3} />
                  </Pressable>
                </Card>
              </Animated.View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Pressable
            disabled={section.collapsed === undefined}
            onPress={() => (section.key === 'done' ? setShowDone((v) => !v) : setShowResting((v) => !v))}
            style={styles.sectionHeader}
          >
            <Text style={[styles.sectionTitle, section.urgent && { color: colors.red }]}>{section.title}</Text>
            {section.collapsed !== undefined ? (
              <Ionicons name={section.collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text3} />
            ) : null}
          </Pressable>
        )}
        renderItem={({ item }) => (
          <ItemRow status={item} onToggle={() => toggle(item)} onLongPress={() => router.push({ pathname: '/settings/item', params: { id: item.item.id } })} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 40 }}>🧘</Text>
            <Text style={{ color: colors.text2 }}>Nothing on the list. Add items in Settings.</Text>
          </View>
        }
      />
    </View>
  );
}

export type { Slot };

const styles = StyleSheet.create({
  day: { color: colors.text, fontSize: 36, fontFamily: font.display, letterSpacing: 1, textTransform: 'uppercase' },
  streak: { color: colors.orange, fontSize: 28, fontFamily: font.display },
  level: { color: colors.gold, fontFamily: font.display, fontSize: 14, letterSpacing: 2 },
  xp: { color: colors.text3, fontFamily: font.display, fontSize: 13, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  xpTrack: { height: 6, backgroundColor: colors.bg2, borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  xpFill: { height: 6, backgroundColor: colors.gold, borderRadius: 3 },
  ringPct: { color: colors.text, fontSize: 28, fontFamily: font.display },
  score: { color: colors.gold, fontSize: 46, fontFamily: font.display, letterSpacing: 1, fontVariant: ['tabular-nums'] },
  sub: { color: colors.text, fontFamily: font.display, fontSize: 18, fontVariant: ['tabular-nums'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  sectionTitle: { color: colors.text2, fontSize: 12.5, fontFamily: font.display, letterSpacing: 2.4, textTransform: 'uppercase' },
});
