import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Button, Card, Field, H1, Input, NumberInput, Pill, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { formatTime } from '@/lib/dates';
import { parseFoodText, suggestFoods } from '@/lib/foods';
import { useToday } from '@/lib/selectors';
import { useStore } from '@/store/useStore';
import { colors, font, space } from '@/theme';

function Bar({ value, target, color, unit }: { value: number; target: number; color: string; unit: string }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  const hit = target > 0 && value >= target;
  return (
    <View style={{ gap: 6 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[styles.value, { color: hit ? colors.accent : colors.text }]}>
          {Math.round(value)}
          <Text style={{ color: colors.text3, fontSize: 13, fontFamily: font.body }}>
            {' '}
            / {target} {unit}
          </Text>
        </Text>
        {hit ? <Pill>TARGET HIT</Pill> : <Small>{Math.max(0, Math.round(target - value))} to go</Small>}
      </Row>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, pct * 100)}%`, backgroundColor: hit ? colors.accent : color }]} />
      </View>
    </View>
  );
}

export default function NutritionScreen() {
  const today = useToday();
  const day = useStore((s) => s.nutrition[today]) ?? { calories: 0, protein: 0, waterMl: 0, entries: [] };
  const settings = useStore((s) => s.settings);
  const customFoods = useStore((s) => s.customFoods);
  const add = useStore((s) => s.addNutrition);
  const addFoodEntry = useStore((s) => s.addFoodEntry);
  const removeFoodEntry = useStore((s) => s.removeFoodEntry);
  const addCustomFood = useStore((s) => s.addCustomFood);
  const removeCustomFood = useStore((s) => s.removeCustomFood);
  const setNutrition = useStore((s) => s.setNutrition);
  const updateSettings = useStore((s) => s.updateSettings);
  const shakeDone = useStore((s) => {
    const it = s.items.find((i) => i.link === 'shake');
    return !!it && !!s.completions[today]?.[it.id];
  });

  const [text, setText] = useState('');
  const [editTargets, setEditTargets] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState<{ name: string; serving: string; calories: number | null; protein: number | null }>({ name: '', serving: '1 serving', calories: null, protein: null });

  const parsed = text.trim().length > 1 ? parseFoodText(text, customFoods) : null;
  const suggestions = text.trim().length > 1 && !parsed ? suggestFoods(text, customFoods) : text.trim().length > 1 && parsed && parsed.confidence < 0.7 ? suggestFoods(text, customFoods, 3) : [];
  const entries = [...(day.entries ?? [])].reverse();

  const quick = (delta: Parameters<typeof add>[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    add(delta);
  };

  const logParsed = () => {
    if (!parsed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const isShake = parsed.food.id === 'protein-shake' || parsed.food.id === 'whey';
    addFoodEntry({ label: parsed.label, calories: parsed.calories, protein: parsed.protein }, { shake: isShake });
    setText('');
  };

  const logShake = () => {
    const p = parseFoodText('1 protein shake');
    if (!p) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addFoodEntry({ label: 'Daily protein shake', calories: p.calories, protein: p.protein }, { shake: true });
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Fuel</H1>
        <Button title={editTargets ? 'Done' : 'Targets'} variant="ghost" small onPress={() => setEditTargets((v) => !v)} />
      </Row>
      <Small>Type what you ate. Hitting a target auto-checks the matching Today item.</Small>

      {editTargets ? (
        <Card style={{ gap: 12, marginTop: space.lg }}>
          <Field label="Calorie target">
            <NumberInput value={settings.calorieTarget} onChange={(v) => updateSettings({ calorieTarget: v ?? 0 })} suffix="kcal" />
          </Field>
          <Field label="Protein target">
            <NumberInput value={settings.proteinTarget} onChange={(v) => updateSettings({ proteinTarget: v ?? 0 })} suffix="g" />
          </Field>
          <Field label="Water target">
            <NumberInput value={settings.waterTargetMl} onChange={(v) => updateSettings({ waterTargetMl: v ?? 0 })} suffix="ml" />
          </Field>
        </Card>
      ) : null}

      <Card style={{ gap: 18, marginTop: space.lg }}>
        <View style={{ gap: 4 }}>
          <Small>CALORIES</Small>
          <Bar value={day.calories} target={settings.calorieTarget} color={colors.orange} unit="kcal" />
        </View>
        <View style={{ gap: 4 }}>
          <Small>PROTEIN</Small>
          <Bar value={day.protein} target={settings.proteinTarget} color={colors.red} unit="g" />
        </View>
        <View style={{ gap: 4 }}>
          <Small>WATER</Small>
          <Bar value={day.waterMl} target={settings.waterTargetMl} color={colors.blue} unit="ml" />
        </View>
      </Card>

      <SectionTitle>Log food</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Input
          value={text}
          onChangeText={setText}
          placeholder='e.g. "2 cups of full fat greek yogurt"'
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={logParsed}
        />
        {parsed ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.preview}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewLabel}>{parsed.label}</Text>
              <Small>
                {parsed.grams > 0 ? `${parsed.grams} g · ` : ''}
                {parsed.confidence < 0.6 ? 'best guess — check the name' : 'matched'}
              </Small>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.previewKcal}>{parsed.calories} kcal</Text>
              <Text style={styles.previewProt}>{parsed.protein} g protein</Text>
            </View>
          </Animated.View>
        ) : text.trim().length > 1 ? (
          <Small style={{ color: colors.orange }}>No match yet. Try a simpler name, or save it as a custom food below.</Small>
        ) : null}
        {suggestions.length > 0 ? (
          <Row style={{ flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  const m = text.match(/^\s*([\d./½¼¾\s]+(?:cups?|cup|g|grams?|oz|tbsp|tsp|scoops?|slices?|pieces?|servings?|ml)?\s*(?:of)?)/i);
                  const prefix = m ? m[1].trim() : '';
                  setText(`${prefix ? `${prefix} ` : ''}${s}`);
                }}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{s}</Text>
              </Pressable>
            ))}
          </Row>
        ) : null}
        <Button title="Add to today" onPress={logParsed} disabled={!parsed} />
      </Card>

      <SectionTitle>Quick add</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          title={shakeDone ? 'Shake logged ✓' : 'Protein shake'}
          variant={shakeDone ? 'secondary' : 'gold'}
          onPress={logShake}
          style={[styles.q, { minWidth: '100%' }]}
          disabled={shakeDone}
        />
        <Button title="+25g protein" variant="secondary" onPress={() => quick({ protein: 25 })} style={styles.q} />
        <Button title="+40g protein" variant="secondary" onPress={() => quick({ protein: 40 })} style={styles.q} />
        <Button title="+250 cal" variant="secondary" onPress={() => quick({ calories: 250 })} style={styles.q} />
        <Button title="+500 cal" variant="secondary" onPress={() => quick({ calories: 500 })} style={styles.q} />
        <Button title="+1 water (500ml)" variant="secondary" onPress={() => quick({ waterMl: 500 })} style={[styles.q, { minWidth: '100%' }]} />
      </View>

      <SectionTitle>Today&apos;s log</SectionTitle>
      {entries.length === 0 ? (
        <Card>
          <Small>Nothing logged yet. Quick-adds count toward the bars but only typed foods show here.</Small>
        </Card>
      ) : (
        <Card style={{ gap: 0, paddingVertical: 6 }}>
          {entries.map((e, i) => (
            <View key={e.id} style={[styles.entry, i < entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryLabel}>{e.label}</Text>
                <Small>{formatTime(new Date(e.at))}</Small>
              </View>
              <Text style={styles.entryMacro}>
                {e.calories} <Text style={{ color: colors.text3 }}>kcal</Text>
              </Text>
              <Text style={[styles.entryMacro, { color: colors.red }]}>
                {e.protein} <Text style={{ color: colors.text3 }}>g</Text>
              </Text>
              <Pressable onPress={() => removeFoodEntry(today, e.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.text3} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <SectionTitle
        right={<Button title={showCustom ? 'Close' : 'Add'} variant="ghost" small onPress={() => setShowCustom((v) => !v)} />}
      >
        Custom foods
      </SectionTitle>
      {showCustom ? (
        <Card style={{ gap: 10, marginBottom: 10 }}>
          <Input value={custom.name} onChangeText={(name) => setCustom((c) => ({ ...c, name }))} placeholder="Name, e.g. Mom's lasagna" />
          <Input value={custom.serving} onChangeText={(serving) => setCustom((c) => ({ ...c, serving }))} placeholder="Serving, e.g. 1 slab" />
          <Row style={{ gap: 8 }}>
            <NumberInput value={custom.calories} onChange={(v) => setCustom((c) => ({ ...c, calories: v }))} placeholder="Calories" suffix="kcal" style={{ flex: 1 }} />
            <NumberInput value={custom.protein} onChange={(v) => setCustom((c) => ({ ...c, protein: v }))} placeholder="Protein" suffix="g" style={{ flex: 1 }} integer={false} />
          </Row>
          <Button
            title="Save custom food"
            disabled={!custom.name.trim() || custom.calories === null}
            onPress={() => {
              addCustomFood({ name: custom.name.trim(), servingLabel: custom.serving.trim() || '1 serving', calories: custom.calories ?? 0, protein: custom.protein ?? 0 });
              setCustom({ name: '', serving: '1 serving', calories: null, protein: null });
              setShowCustom(false);
            }}
          />
        </Card>
      ) : null}
      {customFoods.length === 0 ? (
        <Small>Save your own meals once, then log them by name (&quot;2 mom&apos;s lasagna&quot;).</Small>
      ) : (
        <Card style={{ paddingVertical: 6 }}>
          {customFoods.map((f, i) => (
            <View key={f.id} style={[styles.entry, i < customFoods.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryLabel}>{f.name}</Text>
                <Small>
                  {f.servingLabel} · {f.calories} kcal · {f.protein} g
                </Small>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Delete custom food?', f.name, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeCustomFood(f.id) },
                  ])
                }
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color={colors.text3} />
              </Pressable>
            </View>
          ))}
        </Card>
      )}

      <Button
        title="Reset today"
        variant="ghost"
        small
        onPress={() =>
          Alert.alert('Reset today?', 'Clears calories, protein, water and the food log for today.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => setNutrition(today, { calories: 0, protein: 0, waterMl: 0, entries: [] }) },
          ])
        }
        style={{ alignSelf: 'center', marginTop: space.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: 24, fontFamily: font.display, fontVariant: ['tabular-nums'] },
  track: { height: 10, backgroundColor: colors.bg2, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  fill: { height: 10, borderRadius: 5 },
  q: { flexGrow: 1, minWidth: '47%' },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: `${colors.accent}55`,
    borderRadius: 10,
    padding: 12,
  },
  previewLabel: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 15 },
  previewKcal: { color: colors.gold, fontFamily: font.display, fontSize: 20 },
  previewProt: { color: colors.accent, fontFamily: font.display, fontSize: 15 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border },
  chipText: { color: colors.text2, fontSize: 13, fontFamily: font.body },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  entryLabel: { color: colors.text, fontFamily: font.bodyMedium, fontSize: 14.5 },
  entryMacro: { color: colors.gold, fontFamily: font.display, fontSize: 16, fontVariant: ['tabular-nums'] },
});
