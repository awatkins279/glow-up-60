import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, H1, Input, Row, Screen, Small } from '@/components/ui';
import { uid } from '@/lib/dates';
import { useStore } from '@/store/useStore';
import { colors, space } from '@/theme';

export default function TemplatesScreen() {
  const templates = useStore((s) => s.templates);
  const update = useStore((s) => s.updateTemplate);

  return (
    <Screen>
      <Pressable onPress={() => router.back()} hitSlop={10}>
        <Ionicons name="chevron-back" size={28} color={colors.text2} />
      </Pressable>
      <H1>Workout templates</H1>
      <Small>Rotation is A → B → C. Rename or swap exercises freely; history stays attached to each exercise.</Small>
      <View style={{ gap: 12, marginTop: space.lg }}>
        {templates.map((t) => (
          <Card key={t.id} style={{ gap: 10 }}>
            <Input value={t.name} onChangeText={(name) => update(t.id, { name })} style={{ fontWeight: '900', fontSize: 18 }} />
            {t.exercises.map((e, i) => (
              <Row key={e.id} style={{ gap: 8 }}>
                <Text style={{ color: colors.text3, width: 18, fontWeight: '800' }}>{i + 1}</Text>
                <Input
                  value={e.name}
                  onChangeText={(name) => update(t.id, { exercises: t.exercises.map((x) => (x.id === e.id ? { ...x, name } : x)) })}
                  style={{ flex: 1 }}
                />
                <Pressable onPress={() => update(t.id, { exercises: t.exercises.filter((x) => x.id !== e.id) })} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.text3} />
                </Pressable>
              </Row>
            ))}
            <Button
              title="+ Add exercise"
              variant="secondary"
              small
              style={{ alignSelf: 'flex-start' }}
              onPress={() => update(t.id, { exercises: [...t.exercises, { id: uid(), name: 'New exercise' }] })}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}
