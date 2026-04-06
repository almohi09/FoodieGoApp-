import { Dimensions, useWindowDimensions } from 'react-native';
import { PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const isDesktop = width >= 1200;
  const isSmall = width <= 320;
  const isLandscape = width > height;

  return {
    isTablet,
    isDesktop,
    isSmall,
    isPhone: !isTablet,
    isLandscape,
    width,
    height,
    scale: width / BASE_WIDTH,
    verticalScale: height / BASE_HEIGHT,
  };
};

export const wp = (percentage: number): number => {
  return (percentage * SCREEN_WIDTH) / 100;
};

export const hp = (percentage: number): number => {
  return (percentage * SCREEN_HEIGHT) / 100;
};

export const normalize = (size: number): number => {
  const scale = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const normalizeVertical = (size: number): number => {
  const scale = SCREEN_HEIGHT / BASE_HEIGHT;
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const responsiveFontSize = (size: number): number => {
  const scale = Math.min(
    SCREEN_WIDTH / BASE_WIDTH,
    SCREEN_HEIGHT / BASE_HEIGHT,
  );
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

export const isSmallScreen = (): boolean => SCREEN_WIDTH < 360;
export const isMediumScreen = (): boolean =>
  SCREEN_WIDTH >= 360 && SCREEN_WIDTH < 600;
export const isLargeScreen = (): boolean => SCREEN_WIDTH >= 600;
