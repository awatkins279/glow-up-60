import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, font, gradients } from '@/theme';

function TabBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,9,16,0.96)' }]} />
      <LinearGradient colors={[...gradients.accent, 'rgba(53,200,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topLine} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarBackground: TabBackground,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: 84,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.text3,
        tabBarLabelStyle: { fontFamily: font.display, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Today', tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Train', tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Fuel', tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: 'Progress', tabBarIcon: ({ color, size }) => <Ionicons name="trending-up" size={size} color={color as string} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'System', tabBarIcon: ({ color, size }) => <Ionicons name="settings-sharp" size={size} color={color as string} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
});
