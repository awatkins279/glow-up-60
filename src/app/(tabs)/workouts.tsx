import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Body, Button, Card, Empty, H1, Pill, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { prettyDate } from '@/lib/dates';
import { useTodayBoard } from '@/lib/selectors';
import { lastSessionFor, nextTemplateId, useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

export default function WorkoutsScreen() {
  const templates = useStore((s) => s.templates);
  const sessions = useStore((s) => s.sessions);
  const active = useStore((s) => s.activeSession);
  const startSession = useStore((s) => s.startSession);
  const { statuses } = useTodayBoard();
  const workoutStatus = statuses.find((s) => s.item.link === 'workout');
  const nextId = nextTemplateId(templates, sessions);

  const start = (id: string) => {
    if (active) {
      router.push({ pathname: '/workout/[id]', params: { id: active.id } });
      return;
    }
    const s = startSession(id);
    router.push({ pathname: '/workout/[id]', params: { id: s.id } });
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <H1>Workouts</H1>
        <Pressable onPress={() => router.push('/settings/templates')} hitSlop={10}>
          <Ionicons name="create-outline" size={24} color={colors.text2} />
        </Pressable>
      </Row>
      {workoutStatus ? (
        <Row style={{ marginTop: 6, gap: 8 }}>
          <Small>
            {workoutStatus.doneThisWeek}/{workoutStatus.quota} this week
          </Small>
          {workoutStatus.urgent && !workoutStatus.completed ? <Pill color={colors.red}>MUST DO TODAY</Pill> : null}
          {workoutStatus.completed ? <Pill>DONE TODAY ✓</Pill> : null}
        </Row>
      ) : null}

      {active ? (
        <Card glow style={{ marginTop: space.lg, gap: 8 }}>
          <Small>IN PROGRESS</Small>
          <Body>{active.templateName}</Body>
          <Button title="Resume workout" onPress={() => start(active.templateId)} />
        </Card>
      ) : null}

      <SectionTitle>Templates</SectionTitle>
      <View style={{ gap: 10 }}>
        {templates.map((t) => {
          const last = lastSessionFor(sessions, t.id);
          const isNext = t.id === nextId;
          return (
            <Card key={t.id} glow={isNext} style={{ gap: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>{t.name}</Text>
                  {isNext ? <Pill>NEXT UP</Pill> : null}
                </Row>
                <Small>{last ? `Last: ${prettyDate(last.date)}` : 'Never done'}</Small>
              </Row>
              <Text style={{ color: colors.text2 }}>{t.exercises.map((e) => e.name).join(' · ')}</Text>
              <Button title={isNext ? 'Start workout' : 'Start'} variant={isNext ? 'primary' : 'secondary'} onPress={() => start(t.id)} disabled={!!active} />
            </Card>
          );
        })}
      </View>

      <SectionTitle>History</SectionTitle>
      {sessions.length === 0 ? (
        <Empty emoji="🏋️" title="No sessions yet" body="Finish a workout to auto-check today's Workout item and earn 50 base points." />
      ) : (
        <View style={{ gap: 8 }}>
          {[...sessions]
            .reverse()
            .slice(0, 12)
            .map((s) => (
              <Card key={s.id} style={{ paddingVertical: 12 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{s.templateName}</Text>
                  <Small>{prettyDate(s.date)}</Small>
                </Row>
                <Text style={{ color: colors.text2, fontSize: 13, marginTop: 4 }}>
                  {s.exercises
                    .map((e) => {
                      const best = e.sets.reduce((b, x) => (x.weight > b.weight ? x : b), e.sets[0]);
                      return `${e.name} ${best.weight}×${best.reps}`;
                    })
                    .join(' · ')}
                </Text>
                {s.prs.length > 0 ? <Pill color={colors.gold} style={{ alignSelf: 'flex-start', marginTop: 6 }}>🏅 {s.prs.length} PR</Pill> : null}
              </Card>
            ))}
        </View>
      )}
    </Screen>
  );
}
