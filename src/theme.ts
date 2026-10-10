import { Platform } from 'react-native';

/** Futuristic HUD palette: deep space navy, aurora green → cyan accent, gold for points. */
export const colors = {
  bg: '#04060C',
  bg2: '#090D17',
  card: '#0D1220',
  card2: '#141B2E',
  border: '#1E2740',
  borderBright: '#2C3A5E',
  text: '#EEF3FF',
  text2: '#9AA6C4',
  text3: '#5E6A8A',
  accent: '#2CFFB0',
  accent2: '#35C8FF',
  accentDim: 'rgba(44,255,176,0.12)',
  accentDark: '#0B4D37',
  gold: '#F5C542',
  goldDim: 'rgba(245,197,66,0.14)',
  red: '#FF4D7A',
  redDim: 'rgba(255,77,122,0.14)',
  blue: '#5B8CFF',
  purple: '#A66BFF',
  orange: '#FF8E4D',
};

/** Gradient stops used for primary surfaces and buttons. */
export const gradients = {
  accent: [colors.accent, colors.accent2] as const,
  gold: ['#FFD96A', '#F5A623'] as const,
  cardBorder: ['rgba(53,200,255,0.45)', 'rgba(44,255,176,0.10)', 'rgba(166,107,255,0.25)'] as const,
  cardFill: ['rgba(20,27,46,0.92)', 'rgba(10,14,26,0.96)'] as const,
  glowTop: ['rgba(53,200,255,0.22)', 'rgba(53,200,255,0)'] as const,
  glowBottom: ['rgba(166,107,255,0.18)', 'rgba(166,107,255,0)'] as const,
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 26 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

/** Loaded in the root layout via expo-font. Falls back to system fonts until ready. */
export const font = {
  display: 'Rajdhani_700Bold',
  displayMedium: 'Rajdhani_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string,
};

export const categoryColors: Record<string, string> = {
  Skin: '#A66BFF',
  Supplements: '#5B8CFF',
  Meds: '#5B8CFF',
  Nutrition: '#FF8E4D',
  Training: '#2CFFB0',
  Injections: '#FF4D7A',
  Recovery: '#35C8FF',
  Health: '#F5C542',
};

export const shadow = {
  glow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
};
