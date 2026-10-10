import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';

import { PinPad } from '@/components/LockScreen';
import { TimeField } from '@/components/TimeField';
import { Button, Card, Field, H1, Row, Screen, SectionTitle, Small } from '@/components/ui';
import { exportBackup, importBackup } from '@/lib/backup';
import { addDays, prettyDate } from '@/lib/dates';
import { pendingCount, requestPermission, sendTestNotification } from '@/lib/notifications';
import { useFx } from '@/store/fx';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

function NavRow({ title, sub, onPress }: { title: string; sub?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        {sub ? <Small>{sub}</Small> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.text3} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const items = useStore((s) => s.items);
  const granted = useStore((s) => s.notificationsGranted);
  const setGranted = useStore((s) => s.setNotificationsGranted);
  const updateSettings = useStore((s) => s.updateSettings);
  const resetProgram = useStore((s) => s.resetProgram);
  const toast = useFx((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [pinStep, setPinStep] = useState<null | { first: string | null; error: string | null }>(null);

  const enabledCount = Object.values(settings.notifications).filter((n) => n.enabled).length;

  return (
    <Screen>
      <H1>Settings</H1>

      <SectionTitle>Program</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Start date" hint="Day 1 of your 60. Shifting it re-numbers the calendar; completions stay attached to their dates.">
          <Row style={{ justifyContent: 'space-between' }}>
            <Button title="−1 day" variant="secondary" small onPress={() => updateSettings({ startDate: addDays(settings.startDate, -1) })} />
            <Text style={{ color: colors.accent, fontWeight: '900', fontSize: 16 }}>{prettyDate(settings.startDate)}</Text>
            <Button title="+1 day" variant="secondary" small onPress={() => updateSettings({ startDate: addDays(settings.startDate, 1) })} />
          </Row>
        </Field>
        <Field label="Bedtime" hint="Past-bedtime penalty (0.5x) starts here. Bedtime-routine and lights-out reminders shift with it.">
          <TimeField value={settings.bedtime} onChange={(v) => updateSettings({ bedtime: v })} label="In bed by" />
        </Field>
        <Field label="Night injection time" hint="ON TIME window is ±30 min. Prep / injection / follow-up reminders shift with it.">
          <TimeField value={settings.injectionTime} onChange={(v) => updateSettings({ injectionTime: v })} label="Injections at" />
        </Field>
      </Card>

      <SectionTitle>Manage</SectionTitle>
      <Card style={{ paddingVertical: 4 }}>
        <NavRow title="Items" sub={`${items.length} items · add, edit, reorder, frequency, points, notes`} onPress={() => router.push('/settings/items')} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <NavRow title="Notifications" sub={`${enabledCount}/10 reminders on · edit times`} onPress={() => router.push('/settings/notifications')} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <NavRow title="Workout templates" sub="Day A / B / C exercises" onPress={() => router.push('/settings/templates')} />
      </Card>

      <SectionTitle>Reminders</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text }}>Permission</Text>
          <Text style={{ color: granted ? colors.accent : colors.red, fontWeight: '800' }}>{granted ? 'Granted' : 'Not granted'}</Text>
        </Row>
        {!granted ? (
          <Button
            title="Enable reminders"
            onPress={async () => {
              const ok = await requestPermission();
              setGranted(ok);
              if (!ok) Alert.alert('Reminders off', 'Enable notifications for Glow Up 60 in your phone Settings, then come back.');
            }}
          />
        ) : null}
        <Button
          title="Send test notification (3 s)"
          variant="secondary"
          onPress={async () => {
            try {
              await sendTestNotification();
              toast('Test scheduled — lock your phone or background the app.');
            } catch (e) {
              Alert.alert('Could not schedule', String(e));
            }
          }}
        />
        <Button
          title="Show scheduled count"
          variant="ghost"
          small
          onPress={async () => toast(`${await pendingCount()} reminders scheduled for the next 7 days`)}
        />
      </Card>

      <SectionTitle>Backup</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Small>Everything lives on this phone. Export a JSON file to Files / iCloud Drive and import it on a new phone.</Small>
        <Button
          title="Export backup"
          variant="secondary"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            try {
              await exportBackup();
            } catch (e) {
              Alert.alert('Export failed', String(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          title="Import backup"
          variant="secondary"
          disabled={busy}
          onPress={() =>
            Alert.alert('Import backup?', 'This replaces all current data with the file contents.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Import',
                style: 'destructive',
                onPress: async () => {
                  setBusy(true);
                  try {
                    const res = await importBackup();
                    if (res && !res.ok) Alert.alert('Import failed', res.error);
                    else if (res) toast('Backup restored ✓');
                  } finally {
                    setBusy(false);
                  }
                },
              },
            ])
          }
        />
      </Card>

      <SectionTitle>Privacy</SectionTitle>
      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>App lock (PIN)</Text>
            <Small>{settings.pin ? 'On — asked every time the app opens.' : 'Off — anyone with this device or link can open the app.'}</Small>
          </View>
          <Text style={{ color: settings.pin ? colors.accent : colors.text3, fontWeight: '800' }}>{settings.pin ? 'ON' : 'OFF'}</Text>
        </Row>
        <Button title={settings.pin ? 'Change PIN' : 'Set a PIN'} variant="secondary" onPress={() => setPinStep({ first: null, error: null })} />
        {settings.pin ? <Button title="Remove PIN" variant="ghost" small onPress={() => updateSettings({ pin: null })} /> : null}
      </Card>
      <Modal visible={pinStep !== null} animationType="fade" onRequestClose={() => setPinStep(null)}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 80, alignItems: 'center' }}>
          <Pressable onPress={() => setPinStep(null)} hitSlop={12} style={{ position: 'absolute', top: 56, right: 20 }}>
            <Ionicons name="close" size={28} color={colors.text2} />
          </Pressable>
          {pinStep ? (
            <PinPad
              key={pinStep.first ? 'confirm' : 'first'}
              title={pinStep.first ? 'CONFIRM PIN' : 'NEW PIN'}
              subtitle={pinStep.first ? 'Enter it again' : '4 digits'}
              length={4}
              error={pinStep.error}
              onComplete={(entered) => {
                if (!pinStep.first) {
                  setPinStep({ first: entered, error: null });
                  return true;
                }
                if (entered === pinStep.first) {
                  updateSettings({ pin: entered });
                  setPinStep(null);
                  toast('PIN set ✓');
                  return true;
                }
                setPinStep({ first: null, error: 'PINs did not match — start over' });
                return false;
              }}
            />
          ) : null}
        </View>
      </Modal>

      <SectionTitle>Danger zone</SectionTitle>
      <Card>
        <Button
          title="Reset program"
          variant="danger"
          onPress={() =>
            Alert.alert('Reset everything?', 'All completions, scores, workouts, check-ins and settings are erased. Export a backup first if you want to keep them.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => resetProgram() },
            ])
          }
        />
      </Card>
      <Small style={{ textAlign: 'center', marginTop: space.xl }}>Glow Up 60 · all data on-device · no account</Small>
    </Screen>
  );
}
