import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { LoginOptionsScreen } from '../screens/auth/LoginOptionsScreen';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OTPVerifyScreen } from '../screens/auth/OTPVerifyScreen';
import { UserRegisterScreen } from '../screens/auth/UserRegisterScreen';
import { SellerLoginScreen } from '../screens/auth/SellerLoginScreen';
import { SellerRegisterScreen } from '../screens/auth/SellerRegisterScreen';
import { AdminLoginScreen } from '../screens/auth/AdminLoginScreen';

import { HomeScreen } from '../screens/main/HomeScreen';
import { OrdersScreen } from '../screens/main/OrdersScreen';
import { RewardsScreen } from '../screens/main/RewardsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { LocationEntryScreen } from '../screens/main/LocationEntryScreen';
import { ErrorCenterScreen } from '../screens/debug/ErrorCenterScreen';

import { RestaurantDetailScreen } from '../screens/restaurant/RestaurantDetailScreen';
import { CartScreen } from '../screens/cart/CartScreen';
import { CheckoutScreen } from '../screens/cart/CheckoutScreen';
import { OrderTrackingScreen } from '../screens/cart/OrderTrackingScreen';
import { OrderConfirmedScreen } from '../screens/cart/OrderConfirmedScreen';

import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LoginOptions: undefined;
  PhoneEntry: undefined;
  OTPVerify: { phone: string };
  UserRegister: { phone: string };
  SellerLogin: undefined;
  SellerRegister: { phone: string };
  AdminLogin: undefined;
  MainTabs: undefined;
  RestaurantDetail: { restaurantId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderTracking: { orderId: string };
  OrderConfirmed: { orderId: string };
  SellerDashboard: undefined;
  AdminDashboard: undefined;
  LocationEntry: undefined;
  ErrorCenter: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Rewards: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, string> = {
  Home: '\u{1F3E0}',
  Orders: '\u{1F4CB}',
  Rewards: '\u{1F381}',
  Profile: '\u{1F464}',
};

const MainTabs: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused }) => (
          <View style={styles.tabIconContainer}>
            <Text
              style={[
                styles.tabIcon,
                focused ? styles.tabIconFocused : styles.tabIconUnfocused,
              ]}
            >
              {TAB_ICONS[route.name] || '•'}
            </Text>
          </View>
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { colors, isDark } = theme;

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
      };

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="LoginOptions" component={LoginOptionsScreen} />
        <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
        <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
        <Stack.Screen name="UserRegister" component={UserRegisterScreen} />
        <Stack.Screen name="SellerLogin" component={SellerLoginScreen} />
        <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="RestaurantDetail"
          component={RestaurantDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen
          name="OrderConfirmed"
          component={OrderConfirmedScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen
          name="SellerDashboard"
          component={SellerDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="LocationEntry"
          component={LocationEntryScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ErrorCenter"
          component={ErrorCenterScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
  },
  tabIconFocused: {
    opacity: 1,
  },
  tabIconUnfocused: {
    opacity: 0.6,
  },
});
