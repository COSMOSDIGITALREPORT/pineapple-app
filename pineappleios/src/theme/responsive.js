import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

// Base design width (iPhone 14 Pro = 393px)
const BASE_WIDTH = 393;
const scale = W / BASE_WIDTH;

// Scale a size proportionally to screen width
export const s = (size) => Math.round(PixelRatio.roundToNearestPixel(size * scale));

// Font size — slightly less aggressive scaling than layout
export const fs = (size) => {
  const scaled = size * Math.min(scale, 1.2);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
};

// Width percentage
export const wp = (percent) => (W * percent) / 100;

// Height percentage
export const hp = (percent) => (H * percent) / 100;

// Screen dimensions
export const SCREEN_W = W;
export const SCREEN_H = H;

// Is small screen (iPhone SE, older Androids)
export const isSmallScreen = W <= 375;

// Is large screen (iPhone Pro Max, large Androids)
export const isLargeScreen = W >= 428;
