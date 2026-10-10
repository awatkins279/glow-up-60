import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Field, H1, Input, NumberInput, Row, Screen, Segmented, Small, Toggle } from '@/components/ui';
import { CATEGORIES, SLOT_LABELS, SLOT_ORDER, type Category, type Item, type Slot } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { categoryColors, colors, space } from '@/theme';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ItemEditor() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useStore((s) => s.items.find((i) => i.id === id));
  const addItem = useStore((s) => s.addItem);
  const updateItem = useStore((s) => s.updateItem);
  const deleteItem = useStore((s) => s.deleteItem);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'Skin');
  const [kind, setKind] = useState<'daily' | 'weekly'>(existing?.frequency.kind ?? 'daily');
  const [times, setTimes] = useState<number | null>(existing?.frequency.kind === 'weekly' ? existing.frequency.times : 3);
  const [slot, setSlot] = useState<Slot>(existing?.slot ?? 'morning');
  const [points, setPoints] = useState<number | null>(existing?.basePoints ?? 10);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [noB2B, setNoB2B] = useState(existing?.noBackToBack ?? false);
  const [fixed, setFixed] = useState<number[]>(existing?.fixedWeekdays ?? []);

  const valid = name.trim().length > 0 && (points ?? 0) > 0 && (kind === 'daily' || (times ?? 0) >= 1);

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const payload: Omit<Item, 'id' | 'order'> = {
      name: name.trim(),
      category,
      frequency: kind === 'daily' ? { kind: 'daily' } : { kind: 'weekly', times: Math.min(7, Math.max(1, times ?? 1)) },
      slot,
      basePoints: Math.max(1, points ?? 1),
      notes: notes.trim(),
      noBackToBack: kind === 'weekly' ? noB2B : false,
      fixedWeekdays: kind === 'weekly' ? [...fixed].sort() : [],
      link: existing?.link,
    };
    if (existing) updateItem(existing.id, payload);
    else addItem(payload);
    router.back();
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={28} color={colors.text2} />
        </Pressable>
        {existing ? (
          <Pressable
            onPress={() =>
              Alert.alert('Delete item?', `"${existing.name}" will be removed from your list. Past completions stay in history.`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    deleteItem(existing.id);
                    router.back();
                  },
                },
              ])
            }
            hitSlop={10}
          >
            <Text style={{ color: colors.red, fontWeight: '800' }}>Delete</Text>
          </Pressable>
        ) : null}
      </Row>
      <H1>{existing ? 'Edit item' : 'New item'}</H1>
      {existing?.link ? <Small>Linked to {existing.link} auto-check. Renaming is fine.</Small> : null}

      <View style={{ gap: space.lg, marginTop: space.lg }}>
        <Field label="Name">
          <Input value={name} onChangeText={setName} placeholder="e.g. Creatine" autoFocus={!existing} />
        </Field>

        <Field label="Category">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {CATEGORIES.map((c) => {
              const on = c === category;
              const color = categoryColors[c];
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? color : `${color}22`, borderWidth: 1, borderColor: `${color}66` }}
                >
                  <Text style={{ color: on ? '#06110A' : color, fontWeight: '900', fontSize: 12 }}>{c}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Field>

        <Field label="Frequency">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'N times / week' },
            ]}
          />
          {kind === 'weekly' ? (
            <Row style={{ marginTop: 8, gap: 6 }}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setTimes(n)}
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: times === n ? colors.accent : colors.card2 }}
                >
                  <Text style={{ color: times === n ? '#06110A' : colors.text, fontWeight: '900' }}>{n}x</Text>
                </Pressable>
              ))}
            </Row>
          ) : null}
        </Field>

        <Field label="Time slot">
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {SLOT_ORDER.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSlot(s)}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: slot === s ? colors.accent : colors.card2 }}
              >
                <Text style={{ color: slot === s ? '#06110A' : colors.text, fontWeight: '800' }}>{SLOT_LABELS[s]}</Text>
              </Pressable>
            ))}
          </Row>
        </Field>

        <Field label="Base points">
          <NumberInput value={points} onChange={setPoints} suffix="pts" />
        </Field>

        <Field label="Notes (dose, brand, etc.)">
          <Input value={notes} onChangeText={setNotes} placeholder="Private — shown on the Today row" multiline />
        </Field>

        {kind === 'weekly' ? (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>No back-to-back days</Text>
                <Small>Hide the day after a completion unless needed for the quota.</Small>
              </View>
              <Toggle value={noB2B} onChange={setNoB2B} />
            </Row>
            <Field label="Fixed weekdays (optional)" hint="Leave empty to let the app float the item until the quota is met.">
              <Row style={{ gap: 6 }}>
                {WEEKDAYS.map((d, i) => {
                  const n = i + 1;
                  const on = fixed.includes(n);
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setFixed((f) => (on ? f.filter((x) => x !== n) : [...f, n]))}
                      style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: on ? colors.gold : colors.card2 }}
                    >
                      <Text style={{ color: on ? '#06110A' : colors.text, fontWeight: '900', fontSize: 12 }}>{d}</Text>
                    </Pressable>
                  );
                })}
              </Row>
            </Field>
          </>
        ) : null}

        <Button title={existing ? 'Save changes' : 'Add item'} onPress={save} disabled={!valid} />
      </View>
    </Screen>
  );
}
