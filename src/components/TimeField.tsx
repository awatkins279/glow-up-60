import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { format12h, formatHHMM, parseHHMM } from '@/lib/dates';
import { colors, radius, space } from '@/theme';
import { Button } from './ui';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

/** Tap-to-open time picker (hour + 5-minute steps). Value is HH:mm. */
export function TimeField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const mins = parseHHMM(value);
  const [h, setH] = useState(Math.floor(mins / 60));
  const [m, setM] = useState(Math.round((mins % 60) / 5) * 5 % 60);

  const openPicker = () => {
    const cur = parseHHMM(value);
    setH(Math.floor(cur / 60));
    setM((Math.round((cur % 60) / 5) * 5) % 60);
    setOpen(true);
  };

  return (
    <>
      <Pressable onPress={openPicker} style={styles.field}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.value}>{format12h(value)}</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label ?? 'Pick a time'}</Text>
          <Text style={styles.preview}>{format12h(formatHHMM(h * 60 + m))}</Text>
          <View style={{ flexDirection: 'row', gap: space.md, height: 220 }}>
            <Column items={HOURS} value={h} onChange={setH} render={(v) => format12h(formatHHMM(v * 60)).replace(':00', '')} />
            <Column items={MINUTES} value={m} onChange={setM} render={(v) => `:${String(v).padStart(2, '0')}`} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.lg }}>
            <Button title="Cancel" variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <Button
              title="Set"
              onPress={() => {
                onChange(formatHHMM(h * 60 + m));
                setOpen(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function Column<T extends number>({
  items,
  value,
  onChange,
  render,
}: {
  items: T[];
  value: number;
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <ScrollView style={styles.col} contentContainerStyle={{ paddingVertical: 4 }} showsVerticalScrollIndicator={false}>
      {items.map((it) => {
        const on = it === value;
        return (
          <Pressable
            key={it}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(it);
            }}
            style={[styles.cell, on && styles.cellOn]}
          >
            <Text style={[styles.cellText, on && { color: '#06110A' }]}>{render(it)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { color: colors.text2, fontSize: 15 },
  value: { color: colors.accent, fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000000AA' },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 40,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: { color: colors.text2, fontWeight: '800', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  preview: { color: colors.gold, fontSize: 34, fontWeight: '900', marginVertical: space.sm, fontVariant: ['tabular-nums'] },
  col: { flex: 1, backgroundColor: colors.bg2, borderRadius: radius.sm },
  cell: { paddingVertical: 10, alignItems: 'center', marginHorizontal: 4, borderRadius: 8 },
  cellOn: { backgroundColor: colors.accent },
  cellText: { color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
