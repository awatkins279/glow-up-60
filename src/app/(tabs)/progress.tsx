import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CompareSlider } from '@/components/CompareSlider';
import { buildHeatCells, Heatmap } from '@/components/Heatmap';
import { LineChart } from '@/components/LineChart';
import { Button, Card, H1, Pill, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { isoWeekday, prettyDate, programDay, weekKeyFor } from '@/lib/dates';
import { dayProgress } from '@/lib/scheduling';
import { dayScore } from '@/lib/scoring';
import { useProgram, useScores } from '@/lib/selectors';
import { BADGES, PROGRAM_DAYS } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

export default function ProgressScreen() {
  const { today, startDate, clamped } = useProgram();
  const { total, level } = useScores();
  const { items, completions, dayBonuses, checkins, badges } = useStore(
    useShallow((s) => ({ items: s.items, completions: s.completions, dayBonuses: s.dayBonuses, checkins: s.checkins, badges: s.badges })),
  );
  const [selected, setSelected] = useState<string | null>(today);

  const cells = buildHeatCells(startDate, today, PROGRAM_DAYS, (d) => ({
    percent: dayProgress(items, completions, d).percent,
    score: dayScore(completions, dayBonuses, d),
  }));
  const sel = cells.find((c) => c.date === selected) ?? null;

  const scorePoints = cells.filter((c) => !c.future).map((c) => ({ x: c.dayNumber, y: c.score }));
  const weightPoints = checkins.filter((c) => c.weight !== null).map((c) => ({ x: Math.max(1, programDay(startDate, c.date)), y: c.weight as number }));
  const skinPoints = checkins.map((c) => ({ x: Math.max(1, programDay(startDate, c.date)), y: c.skin }));

  const photos = checkins.flatMap((c) => c.photos.map((p) => ({ uri: p, date: c.date })));
  const first = photos[0];
  const latest = photos[photos.length - 1];

  const isSunday = isoWeekday(today) === 7;
  const checkedInThisWeek = checkins.some((c) => c.weekKey === weekKeyFor(today));

  return (
    <Screen>
      <H1>Progress</H1>
      <Row style={{ marginTop: 4 }}>
        <Pill color={colors.gold}>LV {level.level.index + 1} · {level.level.title}</Pill>
        <Small>{total} total</Small>
      </Row>

      <Card glow={isSunday && !checkedInThisWeek} style={{ marginTop: space.lg, gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>Weekly check-in 🏆</Text>
          {checkedInThisWeek ? <Pill>DONE THIS WEEK</Pill> : isSunday ? <Pill color={colors.gold}>BOSS FIGHT OPEN</Pill> : <Pill color={colors.text3}>UNLOCKS SUNDAY</Pill>}
        </Row>
        <Small>Weight, skin + energy rating, notes, up to 3 photos. +150 × streak.</Small>
        <Button title={checkedInThisWeek ? 'Update check-in' : 'Start check-in'} variant={isSunday ? 'gold' : 'secondary'} onPress={() => router.push('/checkin')} />
      </Card>

      <SectionTitle>60-day map</SectionTitle>
      <Card>
        <Heatmap cells={cells} selected={selected} onSelect={setSelected} />
        {sel ? (
          <Pressable onPress={() => !sel.future && router.push({ pathname: '/day/[date]', params: { date: sel.date } })} style={styles.selBox}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '900' }}>
                Day {sel.dayNumber} · {prettyDate(sel.date)}
              </Text>
              <Small>{sel.future ? 'Upcoming' : `${Math.round(sel.percent * 100)}% complete · tap for details`}</Small>
            </View>
            {!sel.future ? <Text style={{ color: colors.gold, fontWeight: '900', fontSize: 20 }}>{sel.score}</Text> : null}
          </Pressable>
        ) : null}
      </Card>

      <SectionTitle>Daily score</SectionTitle>
      <Card>
        <LineChart points={scorePoints} color={colors.gold} unit=" pts" minY={0} />
      </Card>
      <SectionTitle>Weight</SectionTitle>
      <Card>
        <LineChart points={weightPoints} color={colors.blue} emptyText="Log weight in a weekly check-in" />
      </Card>
      <SectionTitle>Skin rating</SectionTitle>
      <Card>
        <LineChart points={skinPoints} color={colors.purple} unit="/10" minY={0} maxY={10} emptyText="Rate your skin in a weekly check-in" />
      </Card>

      <SectionTitle>Photos</SectionTitle>
      {first && latest && first.uri !== latest.uri ? (
        <CompareSlider before={first.uri} after={latest.uri} beforeLabel={`Day ${Math.max(1, programDay(startDate, first.date))}`} afterLabel={`Day ${Math.max(1, programDay(startDate, latest.date))}`} />
      ) : first ? (
        <Card style={{ alignItems: 'center', gap: 8 }}>
          <Image source={{ uri: first.uri }} style={{ width: '100%', height: 320, borderRadius: 14 }} contentFit="cover" />
          <Small>Add a second check-in photo to unlock the before/after slider.</Small>
        </Card>
      ) : (
        <Card>
          <Small>No progress photos yet. Add them in your weekly check-in.</Small>
        </Card>
      )}

      <SectionTitle>Badges</SectionTitle>
      <View style={styles.badgeGrid}>
        {BADGES.map((b) => {
          const earned = badges[b.id] !== undefined;
          return (
            <View key={b.id} style={[styles.badge, earned && styles.badgeOn]}>
              <Text style={{ fontSize: 28, opacity: earned ? 1 : 0.25 }}>{b.emoji}</Text>
              <Text style={[styles.badgeName, !earned && { color: colors.text3 }]} numberOfLines={2}>
                {b.name}
              </Text>
              <Text style={styles.badgeDesc} numberOfLines={2}>
                {b.description}
              </Text>
            </View>
          );
        })}
      </View>
      <Small style={{ marginTop: space.md, textAlign: 'center' }}>Day {clamped} of {PROGRAM_DAYS}</Small>
    </Screen>
  );
}

const styles = StyleSheet.create({
  selBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { width: '31%', flexGrow: 1, backgroundColor: colors.card, borderRadius: 14, padding: 10, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  badgeOn: { borderColor: `${colors.gold}88`, backgroundColor: '#1A1708' },
  badgeName: { color: colors.text, fontWeight: '900', fontSize: 12, textAlign: 'center' },
  badgeDesc: { color: colors.text3, fontSize: 10, textAlign: 'center' },
});
