import { Platform } from 'react-native';

export const spacing = Object.freeze({
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  display: 64,
});

export const typography = Object.freeze({
  family: {
    display: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'system-ui' }),
    body: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'system-ui' }),
    mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  size: {
    micro: 10,
    caption: 12,
    bodySmall: 13,
    body: 15,
    input: 16,
    titleSmall: 17,
    title: 21,
    heading: 28,
    display: 38,
  },
  lineHeight: {
    micro: 13,
    caption: 16,
    bodySmall: 18,
    body: 22,
    input: 22,
    titleSmall: 22,
    title: 27,
    heading: 34,
    display: 43,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
});

export const radius = Object.freeze({
  xs: 4,
  sm: 7,
  md: 10,
  lg: 14,
  xl: 20,
  round: 999,
});

export const iconSize = Object.freeze({
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
});

export const touchTarget = Object.freeze({
  compact: 44,
  default: 48,
  comfortable: 52,
});

export const motion = Object.freeze({
  instant: 100,
  fast: 160,
  normal: 240,
  slow: 360,
  easing: {
    standard: [0.2, 0, 0, 1],
    emphasized: [0.16, 1, 0.3, 1],
  },
});

export const elevation = Object.freeze({
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  floating: {
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  sheet: {
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 12,
  },
});

export const layout = Object.freeze({
  screenPadding: 18,
  screenPaddingSmall: 14,
  contentMaxWidth: 560,
  authMaxWidth: 520,
  bubbleMaxWidthRatio: 0.78,
  tabBarMinHeight: 64,
  headerContentHeight: 60,
});

export const componentState = Object.freeze({
  disabledOpacity: 0.42,
  mutedOpacity: 0.62,
  pressedScale: 0.975,
  skeletonMinOpacity: 0.38,
  skeletonMaxOpacity: 0.78,
});

export const lightColors = Object.freeze({
  mode: 'light',
  background: '#F4F2ED',
  surface: '#FFFEFB',
  surfaceRaised: '#FFFFFF',
  surfaceAlt: '#ECE8E1',
  surfaceSubtle: '#F8F6F1',
  surfacePressed: '#E4DFD6',
  overlay: 'rgba(32, 31, 29, 0.42)',
  text: '#22211F',
  textMuted: '#6E6A63',
  textSubtle: '#969087',
  border: '#D9D4CB',
  divider: '#E7E2D9',
  primary: '#286B60',
  primaryPressed: '#20564D',
  primarySoft: '#DCEAE5',
  onPrimary: '#FFFFFF',
  accent: '#286B60',
  accentSoft: '#DCEAE5',
  danger: '#A74646',
  dangerPressed: '#863838',
  dangerSoft: '#F3E0DE',
  onDanger: '#FFFFFF',
  warning: '#956E31',
  warningSoft: '#F2E8D2',
  success: '#39745A',
  successSoft: '#DDEBE2',
  info: '#4D687D',
  infoSoft: '#E0E8ED',
  unread: '#E5EEE9',
  skeleton: '#DED9D0',
  bubbleMine: '#286B60',
  bubbleMineText: '#FFFFFF',
  bubbleMineMuted: '#D9ECE7',
  bubbleMineSurface: '#20564D',
  bubbleTheir: '#FFFEFB',
  tab: '#FFFEFB',
  shadow: '#3D3933',
  mascotFace: '#FFFEFB',
  mascotEar: '#22211F',
});

export const darkColors = Object.freeze({
  mode: 'dark',
  background: '#141310',
  surface: '#1D1B18',
  surfaceRaised: '#24221E',
  surfaceAlt: '#2A2823',
  surfaceSubtle: '#191815',
  surfacePressed: '#35322C',
  overlay: 'rgba(0, 0, 0, 0.64)',
  text: '#F2EFE8',
  textMuted: '#AAA49A',
  textSubtle: '#777168',
  border: '#3B3831',
  divider: '#2F2C27',
  primary: '#86BDB1',
  primaryPressed: '#A3CEC5',
  primarySoft: '#243D37',
  onPrimary: '#10231F',
  accent: '#86BDB1',
  accentSoft: '#243D37',
  danger: '#DF8986',
  dangerPressed: '#EDAAA7',
  dangerSoft: '#432826',
  onDanger: '#251010',
  warning: '#D0AE72',
  warningSoft: '#3B3221',
  success: '#83B99D',
  successSoft: '#25392E',
  info: '#91AFC2',
  infoSoft: '#29363E',
  unread: '#22342F',
  skeleton: '#35322C',
  bubbleMine: '#356E65',
  bubbleMineText: '#FFFFFF',
  bubbleMineMuted: '#D7E8E4',
  bubbleMineSurface: '#28574F',
  bubbleTheir: '#24221E',
  tab: '#1D1B18',
  shadow: '#000000',
  mascotFace: '#F2EFE8',
  mascotEar: '#141310',
});

export const tokens = Object.freeze({
  spacing,
  typography,
  radius,
  iconSize,
  touchTarget,
  motion,
  elevation,
  layout,
  componentState,
});
