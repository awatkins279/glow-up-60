import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ItemRow } from '@/components/ItemRow';
import { Card, Empty, H1, Pill, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { prettyDate, programDay, weekKeyFor } from '@/lib/dates';
import { dayProgress, dayStatuses } from '@/lib/scheduling';
import { dayScore } from '@/lib/scoring';
import { useToday } from '@/lib/selectors';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

export default function DayDetail() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const today = useToday();
  const { items, completions, dayBonuses, weekBonuses, startDate } = useStore(
    useShallow((s) => ({ items: s.items, completions: s.completions, dayBonuses: s.dayBonuses, weekBonuses: s.weekBonuses, startDate: s.settings.startDate })),
  );
  const completeItem = useStore((s) => s.completeItem);
  const uncompleteItem = useStore((s) => s.uncompleteItem);

  if (!date) return null;
  const statuses = dayStatuses(items, completions, date).filter((s) => s.due);
  const progress = dayProgress(items, completions, date);
  const score = dayScore(completions, dayBonuses, date);
  const bonuses = dayBonuses[date] ?? {};
  const wk = weekBonuses[weekKeyFor(date)] ?? {};
  const isToday = date === today;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-down" size={28} color={colors.text2} />
      </Pressable>
      <H1>
        Day {Math.max(1, programDay(startDate, date))}
      </H1>
      <Small>{prettyDate(date)}</Small>

      <Card style={{ marginTop: space.lg, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Small>SCORE</Small>
            <Text style={{ color: colors.gold, fontSize: 36, fontWeight: '900' }}>{score}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Small>COMPLETION</Small>
            <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900' }}>{Math.round(progress.percent * 100)}%</Text>
            <Small>
              {progress.done}/{progress.total} items
            </Small>
          </View>
        </Row>
        <Row style={{ flexWrap: 'wrap', gap: 6 }}>
          {progress.percent >= 0.8 ? <Pill color={colors.orange}>🔥 STREAK DAY</Pill> : null}
          {bonuses.perfectDay ? <Pill color={colors.gold}>PERFECT DAY +{bonuses.perfectDay}</Pill> : null}
          {bonuses.perfectNight ? <Pill color={colors.purple}>PERFECT NIGHT +{bonuses.perfectNight}</Pill> : null}
          {wk.quest ? <Pill>WEEKLY QUEST +{wk.quest}</Pill> : null}
          {wk.checkin ? <Pill color={colors.blue}>CHECK-IN +{wk.checkin}</Pill> : null}
        </Row>
      </Card>

      <SectionTitle>{isToday ? 'Today' : 'Items that day'}</SectionTitle>
      {!isToday ? <Small style={{ marginBottom: 8 }}>Past days are read-only — undo is same-day only.</Small> : null}
      {statuses.length === 0 ? (
        <Empty emoji="🗓️" title="Nothing logged" />
      ) : (
        statuses.map((s) => (
          <ItemRow
            key={s.item.id}
            status={s}
            compact
            onToggle={() => {
              if (!isToday) return;
              if (s.completed) uncompleteItem(s.item.id, date);
              else completeItem(s.item.id);
            }}
          />
        ))
      )}
    </Screen>
  );
}
