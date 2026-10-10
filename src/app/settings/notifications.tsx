import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { TimeField } from '@/components/TimeField';
import { Button, Card, H1, Row, Screen, Small, Toggle } from '@/components/ui';
import { DEFAULT_NOTIFICATIONS, NOTIF_LABELS } from '@/lib/seed';
import type { NotifKey } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

const ORDER: NotifKey[] = ['morning', 'midday', 'workout', 'injPrep', 'injections', 'injFollowup', 'bedtimeRoutine', 'lightsOut', 'weeklyQuota', 'checkin'];

const HINTS: Partial<Record<NotifKey, string>> = {
  morning: 'Lists morning items still unchecked.',
  midday: 'Shows protein + water progress.',
  workout: 'Only when Workout is still needed this week.',
  injections: 'Only when an injection is due. Tap opens Today → Night.',
  injFollowup: 'Only if injections are still unchecked.',
  lightsOut: 'Counts night + bedtime items left.',
  weeklyQuota: 'Thursday + Saturday, only if quotas remain.',
  checkin: 'Sunday, only if you have not checked in.',
};

export default function NotificationsSettings() {
  const notifications = useStore((s) => s.settings.notifications);
  const updateSettings = useStore((s) => s.updateSettings);

  const patch = (key: NotifKey, p: Partial<{ enabled: boolean; time: string }>) =>
    updateSettings({ notifications: { ...notifications, [key]: { ...notifications[key], ...p } } });

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={28} color={colors.text2} />
      </Pressable>
      <H1>Notifications</H1>
      <Small>Each reminder is rebuilt from your live checklist, so it is skipped automatically when everything it mentions is done.</Small>

      <View style={{ gap: 10, marginTop: space.lg }}>
        {ORDER.map((key) => {
          const n = notifications[key];
          return (
            <Card key={key} style={{ gap: 10, opacity: n.enabled ? 1 : 0.6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{NOTIF_LABELS[key]}</Text>
                  {HINTS[key] ? <Small>{HINTS[key]}</Small> : null}
                </View>
                <Toggle value={n.enabled} onChange={(v) => patch(key, { enabled: v })} />
              </Row>
              {n.enabled ? <TimeField value={n.time} onChange={(t) => patch(key, { time: t })} label="Time" /> : null}
            </Card>
          );
        })}
      </View>
      <Button
        title="Restore default times"
        variant="ghost"
        style={{ marginTop: space.lg }}
        onPress={() => updateSettings({ notifications: JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS)) })}
      />
    </Screen>
  );
}
