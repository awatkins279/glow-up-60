import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, font, gradients, radius, space } from '@/theme';

/** Ambient glow blobs behind every screen. */
export function Backdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[...gradients.glowTop]} style={styles.glowTop} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} />
      <LinearGradient colors={[...gradients.glowBottom]} style={styles.glowBottom} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} />
      <View style={styles.gridLine} />
    </View>
  );
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; padded?: boolean; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }>) {
  const insets = useSafeAreaInsets();
  const inner = [padded && { paddingHorizontal: space.lg }, { paddingTop: insets.top + space.sm, paddingBottom: 110 }, contentStyle];
  if (!scroll) {
    return (
      <View style={[styles.screen, style]}>
        <Backdrop />
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      </View>
    );
  }
  return (
    <View style={[styles.screen, style]}>
      <Backdrop />
      <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </View>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h2, style]}>{children}</Text>;
}
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}
export function Body({ children, style, dim }: { children: ReactNode; style?: StyleProp<TextStyle>; dim?: boolean }) {
  return <Text style={[styles.body, dim && { color: colors.text2 }, style]}>{children}</Text>;
}
export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.small, style]}>{children}</Text>;
}
export function BigNumber({ children, color = colors.gold, style }: { children: ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.bigNumber, { color }, style]}>{children}</Text>;
}

/** Glass card with a gradient hairline border. */
export function Card({ children, style, glow }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; glow?: boolean }>) {
  return (
    <LinearGradient
      colors={glow ? [colors.accent, colors.accent2, colors.accent] : [...gradients.cardBorder]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.cardOuter, glow && styles.cardGlow]}
    >
      <LinearGradient colors={[...gradients.cardFill]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.cardInner, style]}>
        {children}
      </LinearGradient>
    </LinearGradient>
  );
}

export function Row({ children, style, gap = space.sm }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; gap?: number }>) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Pill({
  children,
  color = colors.accent,
  bg,
  style,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? `${color}1A`, borderColor: `${color}66` }, style]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
  haptic = true,
  small,
  icon,
  ...rest
}: PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  small?: boolean;
  icon?: ReactNode;
}) {
  const gradient = variant === 'primary' ? gradients.accent : variant === 'gold' ? gradients.gold : null;
  const bg = variant === 'danger' ? colors.redDim : variant === 'secondary' ? colors.card2 : 'transparent';
  const fg = gradient ? '#04110C' : variant === 'danger' ? colors.red : colors.text;
  const content = (
    <>
      {icon}
      <Text style={[styles.btnText, small && { fontSize: 13 }, { color: fg }]}>{title.toUpperCase()}</Text>
    </>
  );
  return (
    <Pressable
      disabled={disabled}
      onPress={(e) => {
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.8 : 1, borderRadius: radius.md }, style]}
      {...rest}
    >
      {gradient ? (
        <LinearGradient colors={[...gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, small && styles.btnSmall, variant === 'primary' && styles.btnGlow]}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.btn, small && styles.btnSmall, { backgroundColor: bg }, variant === 'ghost' && { borderWidth: 1, borderColor: colors.borderBright }]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  children,
  style,
}: PropsWithChildren<{ label: string; hint?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Label>{label}</Label>
      {children}
      {hint ? <Small>{hint}</Small> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.text3} {...props} style={[styles.input, props.style]} />;
}

export function NumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  style,
  integer = true,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  suffix?: string;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  integer?: boolean;
}) {
  return (
    <Row style={[styles.input, { paddingVertical: 0 }, style]}>
      <TextInput
        value={value === null || Number.isNaN(value) ? '' : String(value)}
        onChangeText={(t) => {
          if (t.trim() === '') return onChange(null);
          const n = integer ? parseInt(t, 10) : parseFloat(t);
          onChange(Number.isNaN(n) ? null : n);
        }}
        keyboardType={integer ? 'number-pad' : 'decimal-pad'}
        placeholder={placeholder}
        placeholderTextColor={colors.text3}
        style={[styles.inputInner, { flex: 1 }]}
      />
      {suffix ? <Small>{suffix}</Small> : null}
    </Row>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.md }} />;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.sm }}>
      <Row style={{ gap: 8 }}>
        <View style={styles.sectionTick} />
        <Text style={styles.section}>{children}</Text>
      </Row>
      {right}
    </Row>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={[styles.segItem, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && { color: '#04110C' }]}>{o.label.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onChange(!value);
      }}
      style={[styles.toggle, value && { backgroundColor: colors.accent, borderColor: colors.accent }]}
    >
      <View style={[styles.knob, value && { alignSelf: 'flex-end', backgroundColor: '#04110C' }]} />
    </Pressable>
  );
}

export function Empty({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxl, gap: 6 }}>
      <Text style={{ fontSize: 40 }}>{emoji}</Text>
      <Text style={[styles.h2, { textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[styles.body, { color: colors.text2, textAlign: 'center' }]}>{body}</Text> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  glowTop: { position: 'absolute', top: -120, right: -80, width: 360, height: 360, borderRadius: 180 },
  glowBottom: { position: 'absolute', bottom: -160, left: -120, width: 420, height: 420, borderRadius: 210 },
  gridLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(120,150,255,0.03)' },
  h1: { color: colors.text, fontSize: 34, fontFamily: font.display, letterSpacing: 0.5, textTransform: 'uppercase' },
  h2: { color: colors.text, fontSize: 20, fontFamily: font.display, letterSpacing: 0.3 },
  label: { color: colors.text3, fontSize: 11, fontFamily: font.displayMedium, letterSpacing: 2.2, textTransform: 'uppercase' },
  body: { color: colors.text, fontSize: 15, fontFamily: font.body, lineHeight: 22 },
  small: { color: colors.text3, fontSize: 12.5, fontFamily: font.body, lineHeight: 18 },
  bigNumber: { fontSize: 46, fontFamily: font.display, fontVariant: ['tabular-nums'], letterSpacing: 1 },
  cardOuter: { borderRadius: radius.lg, padding: 1 },
  cardGlow: { shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 18, elevation: 6 },
  cardInner: { borderRadius: radius.lg - 1, padding: space.lg },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  pillText: { fontSize: 10.5, fontFamily: font.display, letterSpacing: 1.2 },
  btn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: radius.md,
  },
  btnGlow: { shadowColor: colors.accent, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  btnSmall: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: radius.sm },
  btnText: { fontSize: 15, fontFamily: font.display, letterSpacing: 1.6 },
  input: {
    backgroundColor: 'rgba(9,13,23,0.9)',
    borderWidth: 1,
    borderColor: colors.borderBright,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    fontFamily: font.body,
  },
  inputInner: { color: colors.text, fontSize: 16, paddingVertical: 12, fontFamily: font.mono },
  section: { color: colors.text2, fontSize: 12.5, fontFamily: font.display, letterSpacing: 2.4, textTransform: 'uppercase' },
  sectionTick: { width: 3, height: 14, borderRadius: 2, backgroundColor: colors.accent },
  seg: { flexDirection: 'row', backgroundColor: colors.bg2, borderRadius: radius.sm, padding: 3, borderWidth: 1, borderColor: colors.border },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  segOn: { backgroundColor: colors.accent },
  segText: { color: colors.text2, fontFamily: font.display, fontSize: 12, letterSpacing: 1.2 },
  toggle: { width: 50, height: 30, borderRadius: 15, backgroundColor: colors.card2, padding: 3, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.text2 },
});
