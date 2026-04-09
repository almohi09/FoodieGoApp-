import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../../services/appStore';
import { captureError } from '../../monitoring/errorCenter';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { Colors, Spacing, Typography } from '../../theme';

type SplashNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const session = useAuthStore(state => state.session);
  const profile = useAuthStore(state => state.profile);
  const { theme } = useTheme();
  const logoOpacity = React.useRef(new Animated.Value(0)).current;
  const logoScale = React.useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const init = async () => {
      try {
        await Promise.race([
          useAppStore.getState().loadPersistedState(),
          new Promise<void>(resolve => setTimeout(resolve, 4000)),
        ]);
      } catch (e) {
        captureError(e, 'splash-init');
      }

      const { hasSeenOnboarding } = useAppStore.getState();
      if (session && profile) {
        navigation.replace('MainTabs');
        return;
      }

      if (hasSeenOnboarding) {
        navigation.replace('LoginOptions');
      } else {
        navigation.replace('Onboarding');
      }
    };

    const timer = setTimeout(() => {
      void init();
    }, 1500);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, navigation, profile, session]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.centerWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Text style={[styles.brandMark, { color: theme.colors.textInverse }]}>F</Text>
        <Text style={[styles.title, { color: theme.colors.textInverse }]}>FoodieGo</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.PRIMARY,
  },
  centerWrap: {
    alignItems: 'center',
  },
  brandMark: {
    ...Typography.h1,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h1,
    color: Colors.TEXT_INVERSE,
    fontWeight: '700',
  },
});

export default SplashScreen;
