import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';

import { Button, Card, H1, NumberInput, Pill, Row, Screen, Small } from '@/components/ui';
import type { LoggedExercise, LoggedSet } from '@/lib/types';
import { lastSessionFor, previousBest, useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

export default function WorkoutSession() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const active = useStore((s) => s.activeSession);
  const sessions = useStore((s) => s.sessions);
  const update = useStore((s) => s.updateActiveSession);
  const finish = useStore((s) => s.finishSession);
  const discard = useStore((s) => s.discardActiveSession);

  if (!active || active.id !== id) {
    return (
      <Screen>
        <H1>No active workout</H1>
        <Button title="Back" onPress={() => router.back()} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }

  const last = lastSessionFor(sessions, active.templateId);

  const setExercise = (i: number, patch: Partial<LoggedExercise>) => {
    const ex = active.exercises.map((e, j) => (j === i ? { ...e, ...patch } : e));
    update(ex);
  };
  const addSet = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const ex = active.exercises[i];
    const prev = ex.sets[ex.sets.length - 1];
    const lastEx = last?.exercises.find((e) => e.exerciseId === ex.exerciseId);
    const template: LoggedSet = prev ?? lastEx?.sets[0] ?? { reps: 8, weight: 0 };
    setExercise(i, { sets: [...ex.sets, { ...template }] });
  };
  const setSet = (i: number, j: number, patch: Partial<LoggedSet>) => {
    const ex = active.exercises[i];
    setExercise(i, { sets: ex.sets.map((s, k) => (k === j ? { ...s, ...patch } : s)) });
  };
  const removeSet = (i: number, j: number) => {
    const ex = active.exercises[i];
    setExercise(i, { sets: ex.sets.filter((_, k) => k !== j) });
  };

  const totalSets = active.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-down" size={28} color={colors.text2} />
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert('Discard workout?', 'Nothing will be saved.', [
              { text: 'Keep going', style: 'cancel' },
              {
                text: 'Discard',
                style: 'destructive',
                onPress: () => {
                  discard();
                  router.back();
                },
              },
            ])
          }
          hitSlop={10}
        >
          <Text style={{ color: colors.red, fontWeight: '800' }}>Discard</Text>
        </Pressable>
      </Row>
      <H1>{active.templateName}</H1>
      <Small>{last ? `Beat your last session — numbers shown under each exercise.` : 'First time on this template. Set the bar.'}</Small>

      <View style={{ gap: 12, marginTop: space.lg }}>
        {active.exercises.map((ex, i) => {
          const lastEx = last?.exercises.find((e) => e.exerciseId === ex.exerciseId);
          const best = previousBest(sessions, ex.exerciseId);
          const currentBest = ex.sets.reduce<LoggedSet | null>(
            (b, s) => (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps) ? s : b),
            null,
          );
          const isPR =
            !!best && !!currentBest && (currentBest.weight > best.weight || (currentBest.weight === best.weight && currentBest.reps > best.reps));
          return (
            <Card key={ex.exerciseId} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '900' }}>{ex.name}</Text>
                {isPR ? <Pill color={colors.gold}>🏅 PR</Pill> : null}
              </Row>
              {lastEx && lastEx.sets.length > 0 ? (
                <Small>
                  Beat this: {lastEx.sets.map((s) => `${s.weight}×${s.reps}`).join(', ')}
                  {best ? ` · best ${best.weight}×${best.reps}` : ''}
                </Small>
              ) : null}
              {ex.sets.map((s, j) => (
                <Row key={j} style={{ gap: 8 }}>
                  <Text style={{ color: colors.text3, width: 22, fontWeight: '800' }}>{j + 1}</Text>
                  <NumberInput value={s.weight} onChange={(v) => setSet(i, j, { weight: v ?? 0 })} suffix="lb/kg" integer={false} style={{ flex: 1 }} />
                  <NumberInput value={s.reps} onChange={(v) => setSet(i, j, { reps: v ?? 0 })} suffix="reps" style={{ flex: 1 }} />
                  <Pressable onPress={() => removeSet(i, j)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.text3} />
                  </Pressable>
                </Row>
              ))}
              <Button title="+ Add set" variant="secondary" small onPress={() => addSet(i)} style={{ alignSelf: 'flex-start' }} />
            </Card>
          );
        })}
      </View>

      <Button
        title={totalSets === 0 ? 'Log at least one set' : `Finish workout (${totalSets} sets)`}
        variant="gold"
        disabled={totalSets === 0}
        style={{ marginTop: space.xl }}
        onPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          finish();
          router.back();
        }}
      />
    </Screen>
  );
}
