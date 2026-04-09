import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';
import { useAppStore } from '../../services/appStore';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { Button } from '../../components/common';

type OnboardingNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: string;
  title: string;
  description: string;
  tone: 'primary' | 'success' | 'loyalty';
}

const slides: Slide[] = [
  {
    id: '1',
    icon: 'restaurant',
    title: 'Order from Best Restaurants',
    description:
      'Discover thousands of restaurants and order your favorite dishes with just a few taps.',
    tone: 'primary',
  },
  {
    id: '2',
    icon: 'bicycle',
    title: 'Fast Delivery',
    description:
      'Get your food delivered at your doorstep within 30-45 minutes or schedule for later.',
    tone: 'success',
  },
  {
    id: '3',
    icon: 'gift',
    title: 'Earn Rewards',
    description:
      'Earn FoodieCoins on every order and redeem them for discounts. Get FoodiePass for exclusive benefits!',
    tone: 'loyalty',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigation = useNavigation<OnboardingNavigationProp>();
  const { setOnboardingSeen } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await setOnboardingSeen(true);
    navigation.replace('LoginOptions');
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    const toneColor =
      item.tone === 'success'
        ? colors.success
        : item.tone === 'loyalty'
          ? colors.loyalty
          : colors.primary;

    return (
      <View style={[styles.slide, { width }]}> 
        <View
          style={[styles.iconContainer, { backgroundColor: `${toneColor}20` }]}
        >
          <Icon name={item.icon as any} size={64} color={toneColor} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {item.title}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    );
  };

  const renderDot = (index: number) => {
    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];
    const dotWidth = scrollX.interpolate({
      inputRange,
      outputRange: [10, 30, 10],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          { width: dotWidth, backgroundColor: colors.border },
          currentIndex === index && { backgroundColor: colors.primary },
        ]}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}> 
      <TouchableOpacity activeOpacity={0.7}
        style={styles.skipButton}
        onPress={handleSkip}
        testID="onboarding-skip-button"
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      <View style={styles.pagination}>
        {slides.map((_, index) => renderDot(index))}
      </View>

      <View style={styles.footer}>
        <Button
          title={currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={styles.button}
          testID="onboarding-next-button"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: spacing.xxxl,
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
  },
  skipText: {
    ...typography.bodyMedium,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  button: {
    width: '100%',
  },
});





