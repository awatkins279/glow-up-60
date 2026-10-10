import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { addDays, parseDayKey } from '@/lib/dates';
import { colors } from '@/theme';

export interface HeatCell {
  date: string;
  dayNumber: number;
  percent: number; // 0..1
  score: number;
  future: boolean;
}

export function heatColor(percent: number, future: boolean): string {
  if (future) return colors.bg2;
  if (percent <= 0) return colors.card2;
  if (percent < 0.4) return '#143A26';
  if (percent < 0.8) return '#1F6B40';
  if (percent < 1) return '#2DB866';
  return colors.accent;
}

export function Heatmap({
  cells,
  selected,
  onSelect,
}: {
  cells: HeatCell[];
  selected: string | null;
  onSelect: (date: string) => void;
}) {
  // Arrange by calendar weeks: pad first row so columns are Mon..Sun.
  const first = cells[0];
  const pad = first ? (parseDayKey(first.date).getDay() + 6) % 7 : 0;
  const slots: (HeatCell | null)[] = [...Array.from({ length: pad }, () => null), ...cells];
  while (slots.length % 7 !== 0) slots.push(null);
  const rows: (HeatCell | null)[][] = [];
  for (let i = 0; i < slots.length; i += 7) rows.push(slots.slice(i, i + 7));

  return (
    <View style={{ gap: 6 }}>
      <View style={styles.row}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text key={i} style={styles.dow}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((r, ri) => (
        <View key={ri} style={styles.row}>
          {r.map((c, ci) =>
            c ? (
              <Pressable
                key={c.date}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  onSelect(c.date);
                }}
                style={[
                  styles.cell,
                  { backgroundColor: heatColor(c.percent, c.future) },
                  selected === c.date && styles.cellSelected,
                  c.future && { borderStyle: 'dashed', borderColor: colors.border },
                ]}
              >
                <Text style={[styles.cellText, c.percent >= 0.8 && !c.future && { color: '#06110A' }]}>{c.dayNumber}</Text>
              </Pressable>
            ) : (
              <View key={`e${ci}`} style={[styles.cell, { backgroundColor: 'transparent', borderWidth: 0 }]} />
            ),
          )}
        </View>
      ))}
      <View style={[styles.row, { justifyContent: 'flex-end', gap: 4, marginTop: 4 }]}>
        <Text style={styles.legend}>less</Text>
        {[0, 0.3, 0.6, 0.9, 1].map((p) => (
          <View key={p} style={[styles.legendBox, { backgroundColor: heatColor(p, false) }]} />
        ))}
        <Text style={styles.legend}>more</Text>
      </View>
    </View>
  );
}

export function buildHeatCells(
  startDate: string,
  today: string,
  days: number,
  lookup: (date: string) => { percent: number; score: number },
): HeatCell[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(startDate, i);
    const future = date > today;
    const v = future ? { percent: 0, score: 0 } : lookup(date);
    return { date, dayNumber: i + 1, percent: v.percent, score: v.score, future };
  });
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  dow: { flex: 1, textAlign: 'center', color: colors.text3, fontSize: 11, fontWeight: '800' },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellSelected: { borderColor: colors.gold, borderWidth: 2 },
  cellText: { color: colors.text2, fontSize: 11, fontWeight: '800' },
  legend: { color: colors.text3, fontSize: 10 },
  legendBox: { width: 12, height: 12, borderRadius: 3 },
});
