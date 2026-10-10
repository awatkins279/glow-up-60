import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, H1, Row, Screen, Small } from '@/components/ui';
import { SLOT_LABELS } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { categoryColors, colors, space } from '@/theme';

export default function ItemsScreen() {
  const rawItems = useStore((s) => s.items);
  const items = [...rawItems].sort((a, b) => a.order - b.order);
  const reorder = useStore((s) => s.reorderItems);

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    Haptics.selectionAsync().catch(() => {});
    const ids = items.map((i) => i.id);
    [ids[idx], ids[j]] = [ids[j], ids[idx]];
    reorder(ids);
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={colors.text2} />
        </Pressable>
        <Button title="+ Add item" small onPress={() => router.push('/settings/item')} />
      </Row>
      <H1>Items</H1>
      <Small>Tap to edit. Arrows reorder.</Small>
      <View style={{ gap: 8, marginTop: space.lg }}>
        {items.map((it, idx) => {
          const color = categoryColors[it.category] ?? colors.accent;
          return (
            <Pressable key={it.id} onPress={() => router.push({ pathname: '/settings/item', params: { id: it.id } })} style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name}>{it.name}</Text>
                <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.meta, { color }]}>{it.category}</Text>
                  <Text style={styles.meta}>· {it.frequency.kind === 'daily' ? 'Daily' : `${it.frequency.times}x / week`}</Text>
                  <Text style={styles.meta}>· {SLOT_LABELS[it.slot]}</Text>
                  <Text style={styles.meta}>· {it.basePoints} pts</Text>
                  {it.noBackToBack ? <Text style={styles.meta}>· no b2b</Text> : null}
                  {it.fixedWeekdays.length > 0 ? <Text style={styles.meta}>· fixed days</Text> : null}
                </Row>
              </View>
              <View style={{ gap: 2 }}>
                <Pressable onPress={() => move(idx, -1)} hitSlop={6} disabled={idx === 0}>
                  <Ionicons name="chevron-up" size={22} color={idx === 0 ? colors.border : colors.text2} />
                </Pressable>
                <Pressable onPress={() => move(idx, 1)} hitSlop={6} disabled={idx === items.length - 1}>
                  <Ionicons name="chevron-down" size={22} color={idx === items.length - 1 ? colors.border : colors.text2} />
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  meta: { color: colors.text3, fontSize: 12, fontWeight: '700' },
});
