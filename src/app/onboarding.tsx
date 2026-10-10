import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';

import { TimeField } from '@/components/TimeField';
import { Body, Button, Card, Field, H1, Label, Row, Screen, Segmented, Small } from '@/components/ui';
import { addDays, isoWeekday, prettyDate, toDayKey } from '@/lib/dates';
import { requestPermission } from '@/lib/notifications';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

type StartChoice = 'today' | 'tomorrow' | 'monday';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [startChoice, setStartChoice] = useState<StartChoice>('today');
  const [bedtime, setBedtime] = useState('23:00');
  const [injectionTime, setInjectionTime] = useState('20:00');
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const setGranted = useStore((s) => s.setNotificationsGranted);

  const today = toDayKey(new Date());
  const startDate =
    startChoice === 'today' ? today : startChoice === 'tomorrow' ? addDays(today, 1) : addDays(today, (8 - isoWeekday(today)) % 7 || 7);

  const finish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    completeOnboarding(startDate, bedtime, injectionTime);
    router.replace('/(tabs)');
  };

  return (
    <Screen>
      <Row style={{ gap: 6, marginBottom: space.xl }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? colors.accent : colors.card2 }} />
        ))}
      </Row>

      {step === 0 ? (
        <Animated.View key="s0" entering={FadeInRight} exiting={FadeOutLeft} style={{ gap: space.lg }}>
          <Label>Glow Up 60</Label>
          <H1>Set up your 60 days.</H1>
          <Body dim>Eat more, build lean muscle, clear your skin. One checklist a day, points for everything. No account, no login — everything stays on this phone.</Body>

          <Field label="Program start" hint={`Day 1 = ${prettyDate(startDate)}`}>
            <Segmented
              value={startChoice}
              onChange={setStartChoice}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'monday', label: 'Next Monday' },
              ]}
            />
          </Field>
          <Field label="Bedtime" hint="Tasks logged after this are worth half points. Bedtime items before 15 min earlier get 1.25x.">
            <TimeField value={bedtime} onChange={setBedtime} label="In bed by" />
          </Field>
          <Field label="Night injection time" hint="±30 min around this = ON TIME, 1.5x.">
            <TimeField value={injectionTime} onChange={setInjectionTime} label="Injections at" />
          </Field>
          <Button title="Next" onPress={() => setStep(1)} style={{ marginTop: space.md }} />
        </Animated.View>
      ) : null}

      {step === 1 ? (
        <Animated.View key="s1" entering={FadeInRight} exiting={FadeOutLeft} style={{ gap: space.lg }}>
          <Label>Reminders</Label>
          <H1>Let the app nag you (nicely).</H1>
          <Body dim>
            Everything runs on-device. Reminders are scheduled locally for the next 7 days and rebuilt every time you check
            something off, so they only mention what is still due.
          </Body>
          <Card style={{ gap: 8 }}>
            {[
              ['8:30 AM', 'Morning routine: SPF, vitamins, finasteride'],
              ['1:00 PM', 'Midday protein + water check'],
              ['7:45 PM', 'Injections in 15 min — prep'],
              ['8:00 PM', '💉 Night injections (only when due)'],
              ['9:45 PM', 'Bedtime routine'],
              ['10:30 PM', 'Lights out by 11'],
            ].map(([t, b]) => (
              <Row key={t} style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: colors.gold, fontWeight: '900', width: 76 }}>{t}</Text>
                <Text style={{ color: colors.text2, flex: 1 }}>{b}</Text>
              </Row>
            ))}
            <Small>All times + toggles are editable in Settings.</Small>
          </Card>
          {permission === 'denied' ? (
            <Small style={{ color: colors.red }}>Reminders are off. You can enable them later in your phone&apos;s Settings → Glow Up 60.</Small>
          ) : null}
          <Button
            title={permission === 'granted' ? 'Reminders enabled ✓' : 'Enable reminders'}
            onPress={async () => {
              const ok = await requestPermission();
              setGranted(ok);
              setPermission(ok ? 'granted' : 'denied');
              if (ok) setStep(2);
            }}
            disabled={permission === 'granted'}
          />
          <Button title={permission === 'granted' ? 'Next' : 'Not now'} variant="ghost" onPress={() => setStep(2)} />
        </Animated.View>
      ) : null}

      {step === 2 ? (
        <Animated.View key="s2" entering={FadeInRight} exiting={FadeOutLeft} style={{ gap: space.lg, alignItems: 'center', paddingTop: 40 }}>
          <Text style={{ fontSize: 72 }}>⚡</Text>
          <H1 style={{ textAlign: 'center' }}>Day 1 starts {startChoice === 'today' ? 'now.' : prettyDate(startDate) + '.'}</H1>
          <Body dim style={{ textAlign: 'center' }}>
            17 items seeded, including a daily protein shake. Daily ones every day, weekly ones until the quota is met. Streak × timing ×
            combo multipliers stack on every tap.
          </Body>
          <Button title="Let's go" onPress={finish} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
        </Animated.View>
      ) : null}
    </Screen>
  );
}
