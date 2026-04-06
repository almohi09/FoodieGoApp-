import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

const getInitialValue = (
  direction: 'up' | 'down' | 'left' | 'right',
): number => {
  switch (direction) {
    case 'up':
      return 50;
    case 'down':
      return -50;
    case 'left':
      return 50;
    case 'right':
      return -50;
    default:
      return 50;
  }
};

export const usePressAnimation = (scaleValue = 0.97) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [scaleAnim, scaleValue]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [scaleAnim]);

  return {
    scaleAnim,
    handlePressIn,
    handlePressOut,
    animatedStyle: {
      transform: [{ scale: scaleAnim }],
    },
  };
};

export const useFadeInAnimation = (duration = 300, delay = 0) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const fadeIn = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim, duration, delay]);

  const fadeOut = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim, duration]);

  return {
    opacityAnim,
    fadeIn,
    fadeOut,
    animatedStyle: {
      opacity: opacityAnim,
    },
  };
};

export const useSlideAnimation = (
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
) => {
  const translateAnim = useRef(
    new Animated.Value(getInitialValue(direction)),
  ).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback(
    (animDuration = 300, animDelay = 0) => {
      translateAnim.setValue(getInitialValue(direction));
      Animated.parallel([
        Animated.timing(translateAnim, {
          toValue: 0,
          duration: animDuration,
          delay: animDelay,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: animDuration,
          delay: animDelay,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [translateAnim, opacityAnim, direction],
  );

  return {
    translateAnim,
    opacityAnim,
    slideIn,
    animatedStyle: {
      opacity: opacityAnim,
      transform: [{ translateY: translateAnim }],
    },
  };
};

export const useBounceAnimation = () => {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bounceAnim]);

  return {
    bounceAnim,
    bounce,
    animatedStyle: {
      transform: [{ scale: bounceAnim }],
    },
  };
};
