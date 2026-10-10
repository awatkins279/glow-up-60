import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, Field, H1, Input, NumberInput, Pill, Row, Screen, Small } from '@/components/ui';
import { isoWeekday, weekKeyFor } from '@/lib/dates';
import { deletePhoto, pickPhoto } from '@/lib/photos';
import { useToday } from '@/lib/selectors';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

function Rating({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  return (
    <Row style={{ gap: 4 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Pressable
          key={n}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            onChange(n);
          }}
          style={{ flex: 1, aspectRatio: 0.9, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: n <= value ? color : colors.card2 }}
        >
          <Text style={{ color: n <= value ? '#06110A' : colors.text3, fontWeight: '900', fontSize: 12 }}>{n}</Text>
        </Pressable>
      ))}
    </Row>
  );
}

export default function CheckinScreen() {
  const today = useToday();
  const existing = useStore((s) => s.checkins.find((c) => c.weekKey === weekKeyFor(today)));
  const addCheckin = useStore((s) => s.addCheckin);
  const [unlocked, setUnlocked] = useState(isoWeekday(today) === 7 || !!existing);
  const [weight, setWeight] = useState<number | null>(existing?.weight ?? null);
  const [skin, setSkin] = useState(existing?.skin ?? 5);
  const [energy, setEnergy] = useState(existing?.energy ?? 5);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos ?? []);
  const [busy, setBusy] = useState(false);

  const addPhoto = (camera: boolean) => {
    setBusy(true);
    pickPhoto(camera)
      .then((uri) => {
        if (uri) setPhotos((p) => [...p, uri].slice(0, 3));
      })
      .catch((e) => Alert.alert('Photo failed', String(e)))
      .finally(() => setBusy(false));
  };

  if (!unlocked) {
    return (
      <Screen>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={colors.text2} />
        </Pressable>
        <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
          <Text style={{ fontSize: 64 }}>🔒</Text>
          <H1 style={{ textAlign: 'center' }}>Boss fight unlocks Sunday</H1>
          <Small style={{ textAlign: 'center' }}>
            Weekly check-ins happen on Sundays so your weight, skin and energy trends are evenly spaced.
          </Small>
          <Button title="Unlock early this week" variant="ghost" onPress={() => setUnlocked(true)} style={{ marginTop: 20 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={colors.text2} />
        </Pressable>
        <Pill color={colors.gold}>BOSS FIGHT 🏆</Pill>
      </Row>
      <H1>Weekly check-in</H1>
      <Small>{existing ? 'Already done this week — saving again updates it (no extra bonus).' : '+150 × streak multiplier when you save.'}</Small>

      <View style={{ gap: space.lg, marginTop: space.lg }}>
        <Field label="Weight">
          <NumberInput value={weight} onChange={setWeight} suffix="lb / kg" placeholder="optional" integer={false} />
        </Field>
        <Field label={`Skin · ${skin}/10`}>
          <Rating value={skin} onChange={setSkin} color={colors.purple} />
        </Field>
        <Field label={`Energy · ${energy}/10`}>
          <Rating value={energy} onChange={setEnergy} color={colors.accent} />
        </Field>
        <Field label="Notes">
          <Input value={notes} onChangeText={setNotes} placeholder="How did the week go? Wins, misses, adjustments…" multiline style={{ minHeight: 90 }} />
        </Field>
        <Field label={`Progress photos · ${photos.length}/3`} hint="Compressed and stored only on this phone.">
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            {photos.map((p) => (
              <View key={p} style={{ width: '31%', aspectRatio: 0.75 }}>
                <Image source={{ uri: p }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
                <Pressable
                  onPress={() => {
                    setPhotos((ps) => ps.filter((x) => x !== p));
                    if (!existing?.photos.includes(p)) deletePhoto(p);
                  }}
                  style={{ position: 'absolute', top: 4, right: 4, backgroundColor: '#000A', borderRadius: 12 }}
                >
                  <Ionicons name="close-circle" size={24} color={colors.text} />
                </Pressable>
              </View>
            ))}
          </Row>
          {photos.length < 3 ? (
            <Row style={{ gap: 8, marginTop: 8 }}>
              <Button title="📷 Camera" variant="secondary" small onPress={() => addPhoto(true)} disabled={busy} style={{ flex: 1 }} />
              <Button title="🖼️ Library" variant="secondary" small onPress={() => addPhoto(false)} disabled={busy} style={{ flex: 1 }} />
            </Row>
          ) : null}
        </Field>

        <Card style={{ gap: 4 }}>
          <Small>SUMMARY</Small>
          <Text style={{ color: colors.text }}>
            {weight !== null ? `${weight} · ` : ''}skin {skin}/10 · energy {energy}/10 · {photos.length} photo{photos.length === 1 ? '' : 's'}
          </Text>
        </Card>

        <Button
          title={existing ? 'Update check-in' : 'Complete boss fight'}
          variant="gold"
          onPress={() => {
            addCheckin({ weight, skin, energy, notes: notes.trim(), photos });
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}
