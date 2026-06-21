import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design reference: iPhone 14 / 15 / 16 standard (390 × 844)
const BASE_W = 390;
const BASE_H = 844;

// ─── Scale helpers ────────────────────────────────────────────────────────────

// Horizontal scale — dùng cho: padding, margin, width, icon size
export const scale = (size) =>
  PixelRatio.roundToNearestPixel(size * (W / BASE_W));

// Vertical scale — dùng cho: height, marginTop/Bottom
export const vs = (size) =>
  PixelRatio.roundToNearestPixel(size * (H / BASE_H));

// Moderate scale — dùng cho: font size (scale nhẹ hơn, tránh font quá to/nhỏ)
export const ms = (size, factor = 0.45) => {
  const s = scale(size);
  return PixelRatio.roundToNearestPixel(size + (s - size) * factor);
};

// ─── Device profile ───────────────────────────────────────────────────────────
//
//  SMALL   (W < 375)  : iPhone SE 3rd gen (375×667), Android nhỏ (360×640)
//  MEDIUM  (375–413)  : iPhone 14 (390×844), 15 (393×852), 16 (393×852),
//                       Android mid (360–393 dp)
//  LARGE   (414–429)  : iPhone 14 Plus (428×926), 15 Plus (430×932),
//                       Pixel 8 Pro (412×915), Samsung S24 (412×915)
//  XLARGE  (≥ 430)    : iPhone 16 Pro Max (440×956), 17 Pro Max (440×956),
//                       Samsung S25 Ultra (430×932), Galaxy Fold unfolded

export const Device = {
  width: W,
  height: H,
  pixelRatio: PixelRatio.get(),

  isSmall: W < 375,
  isMedium: W >= 375 && W < 414,
  isLarge: W >= 414 && W < 430,
  isXLarge: W >= 430,

  isIOS: Platform.OS === 'ios',
  isAndroid: Platform.OS === 'android',

  // Màn hình có notch/Dynamic Island
  hasNotch: H >= 812 && Platform.OS === 'ios',
};

// ─── Responsive value selector ────────────────────────────────────────────────
// Dùng khi muốn giá trị khác nhau theo từng nhóm thiết bị
//
// Ví dụ:
//   fontSize: responsive({ small: 13, medium: 15, large: 16, xlarge: 17 })
//   padding:  responsive({ small: 12, medium: 16, large: 20, xlarge: 24 })

export const responsive = ({ small, medium, large, xlarge }) => {
  if (Device.isXLarge && xlarge !== undefined) return xlarge;
  if (Device.isLarge && large !== undefined) return large;
  if (Device.isSmall && small !== undefined) return small;
  return medium ?? small ?? large ?? xlarge;
};

// ─── Preset spacing & font scales (dùng trực tiếp trong StyleSheet) ──────────

export const sp = {
  xs: scale(4),
  sm: scale(8),
  md: scale(16),
  lg: scale(24),
  xl: scale(32),
  xxl: scale(48),
};

export const fs = {
  xs: ms(11),
  sm: ms(13),
  md: ms(15),
  lg: ms(17),
  xl: ms(20),
  xxl: ms(24),
  h2: ms(28),
  h1: ms(34),
};
