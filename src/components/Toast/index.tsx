import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { toastBus, ToastPayload, ToastVariant } from './toastBus';

export interface UseToastOptions {
  type: ToastVariant;
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export const useToast = () => {
  const showToast = ({ type, message, actionLabel, onActionPress }: UseToastOptions) => {
    toastBus.show({
      variant: type,
      message,
      actionLabel,
      onActionPress,
    });
  };

  return { showToast };
};

const ICON_BY_VARIANT: Record<ToastVariant, string> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  info: 'information-circle',
};

const BG_BY_VARIANT: Record<ToastVariant, string> = {
  success: Colors.SUCCESS_LIGHT,
  error: Colors.ERROR_LIGHT,
  info: Colors.INFO_LIGHT,
};

const TEXT_BY_VARIANT: Record<ToastVariant, string> = {
  success: Colors.SUCCESS,
  error: Colors.ERROR,
  info: Colors.INFO,
};

export const ToastHost: React.FC = () => {
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = toastBus.subscribe(next => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPayload(next);
    });
    return () => {
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!payload) {
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setPayload(null);
      });
    }, 3000);
  }, [opacity, payload, translateY]);

  const variant = payload?.variant || 'info';
  const iconName = useMemo(() => ICON_BY_VARIANT[variant], [variant]);

  if (!payload) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: BG_BY_VARIANT[variant],
            borderColor: TEXT_BY_VARIANT[variant],
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <Icon name={iconName} size={18} color={TEXT_BY_VARIANT[variant]} />
        <Text style={[styles.message, { color: Colors.TEXT_PRIMARY }]} numberOfLines={2}>
          {payload.message}
        </Text>
        {payload.actionLabel && payload.onActionPress ? (
          <TouchableOpacity activeOpacity={0.7}
            onPress={payload.onActionPress}
           
            style={styles.action}
          >
            <Text style={[styles.actionText, { color: TEXT_BY_VARIANT[variant] }]}>
              {payload.actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    bottom: Spacing.xl,
    zIndex: 2000,
  },
  toast: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  message: {
    ...Typography.body2,
    flex: 1,
  },
  action: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  actionText: {
    ...Typography.label,
  },
});

export default ToastHost;
