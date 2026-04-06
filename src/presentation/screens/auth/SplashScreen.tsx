import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppStore } from '../../../data/storage/appStore';
import { captureError } from '../../../monitoring/errorCenter';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../../context/ThemeContext';

type SplashNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashNavigationProp>();
  const { theme } = useTheme();
  const { colors } = theme;

  useEffect(() => {
    const init = async () => {
      try {
        await Promise.race([
          useAppStore.getState().loadPersistedState(),
          new Promise<void>(resolve => setTimeout(resolve, 4000)),
        ]);
      } catch (e) {
        captureError(e, 'splash-init');
      }

      setTimeout(() => {
        const { hasSeenOnboarding } = useAppStore.getState();
        if (hasSeenOnboarding) {
          navigation.replace('LoginOptions');
        } else {
          navigation.replace('Onboarding');
        }
      }, 1500);
    };

    init();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={styles.icon}>{'\u{1F354}'}</Text>
      <Text style={[styles.title, { color: colors.textInverse }]}>
        FoodieGo
      </Text>
      <Text style={[styles.tagline, { color: colors.textInverse }]}>
        Loading...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    opacity: 0.9,
  },
});

export default SplashScreen;
