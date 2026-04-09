import React, { useEffect } from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import supabase from '../config/supabase';
import { useAuthStore } from '../store/authStore';
import { notificationService } from '../services/notificationService';
import {
  ProfileSetupScreen,
} from '../screens/auth';
import { LocationEntryScreen } from '../screens/profile/LocationEntryScreen';
import { ErrorCenterScreen } from '../screens/debug/ErrorCenterScreen';
import { RestaurantDetailScreen } from '../screens/restaurant/RestaurantDetailScreen/index';
import { RestaurantListScreen } from '../screens/restaurant/RestaurantListScreen/index';
import { CartScreen } from '../screens/cart';
import { CheckoutScreen } from '../screens/checkout';
import { OrderTrackingScreen } from '../screens/orders/OrderTrackingScreen/index';
import { OrderConfirmedScreen } from '../screens/cart/OrderConfirmedScreen';
import { NotificationsScreen } from '../screens/notifications';
import { SearchScreen } from '../screens/home/SearchScreen';
import { RestaurantOwnerNavigator } from './RestaurantOwnerNavigator';
import { RiderNavigator as RiderRoleNavigator } from './RiderNavigator';
import { AuthNavigator } from './AuthNavigator';
import { TabNavigator } from './TabNavigator';
import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerMenuScreen } from '../screens/seller/SellerMenuScreen';
import { SellerMenuItemFormScreen } from '../screens/seller/SellerMenuItemFormScreen';
import { SellerStoreHoursScreen } from '../screens/seller/SellerStoreHoursScreen';
import { SellerNotificationPreferencesScreen } from '../screens/seller/SellerNotificationPreferencesScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminModerationScreen } from '../screens/admin/AdminModerationScreen';
import { AdminModerationDetailScreen } from '../screens/admin/AdminModerationDetailScreen';
import { AdminDispatchBoardScreen } from '../screens/admin/AdminDispatchBoardScreen';
import { AdminAuditLogScreen } from '../screens/admin/AdminAuditLogScreen';
import { AdminSLABreachScreen } from '../screens/admin/AdminSLABreachScreen';
import { AdminNotificationPreferencesScreen } from '../screens/admin/AdminNotificationPreferencesScreen';
import {
  RiderDashboardScreen,
  RiderEarningsScreen,
  RiderHistoryScreen,
  RiderLoginScreen,
  RiderOTPVerifyScreen,
  RiderTaskDetailScreen,
} from '../screens/rider';
import { colors } from '../theme';

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LoginOptions: undefined;
  PhoneEntry: undefined;
  OTPVerify: { phone: string };
  Login: undefined;
  Signup: undefined;
  ProfileSetup: undefined;
  UserRegister: { phone: string };
  SellerLogin: undefined;
  SellerRegister: { phone: string };
  AdminLogin: undefined;
  RiderLogin: undefined;
  RiderOTPVerify: { phone: string };
  MainTabs: undefined;
  Search: undefined;
  RestaurantList: { category?: string };
  RestaurantDetail: { restaurantId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderTracking: { orderId: string };
  OrderConfirmed: { orderId: string };
  SellerDashboard: undefined;
  SellerMenu: undefined;
  SellerMenuItemForm: { restaurantId: string; item?: unknown; isEditing?: boolean };
  SellerStoreHours: undefined;
  SellerNotificationPreferences: undefined;
  AdminDashboard: undefined;
  AdminModeration: undefined;
  AdminModerationDetail: { item?: unknown };
  AdminDispatchBoard: undefined;
  AdminAuditLog: undefined;
  AdminSLABreach: undefined;
  AdminNotificationPreferences: undefined;
  RiderDashboard: undefined;
  RiderTaskDetail: { orderId: string; order: unknown };
  RiderEarnings: undefined;
  RiderHistory: undefined;
  LocationEntry: undefined;
  ErrorCenter: undefined;
  RestaurantOwnerTabs: undefined;
  OwnerOrderDetail: { orderId: string };
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Orders: undefined;
  Rewards: undefined;
  Profile: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

const ProfileSetupNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
  </RootStack.Navigator>
);

const AdminNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    <RootStack.Screen name="AdminModeration" component={AdminModerationScreen} />
    <RootStack.Screen
      name="AdminModerationDetail"
      component={AdminModerationDetailScreen}
    />
    <RootStack.Screen name="AdminDispatchBoard" component={AdminDispatchBoardScreen} />
    <RootStack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} />
    <RootStack.Screen name="AdminSLABreach" component={AdminSLABreachScreen} />
    <RootStack.Screen
      name="AdminNotificationPreferences"
      component={AdminNotificationPreferencesScreen}
    />
  </RootStack.Navigator>
);

const MainAppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { colors: themedColors } = theme;

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: themedColors.background },
      }}
    >
      <RootStack.Screen name="MainTabs" component={TabNavigator} />
      <RootStack.Screen
        name="Search"
        component={SearchScreen}
      />
      <RootStack.Screen
        name="RestaurantList"
        component={RestaurantListScreen}
      />
      <RootStack.Screen
        name="RestaurantDetail"
        component={RestaurantDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="Cart"
        component={CartScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <RootStack.Screen name="OrderTracking" component={OrderTrackingScreen} />
      <RootStack.Screen name="Notifications" component={NotificationsScreen} />
      <RootStack.Screen
        name="OrderConfirmed"
        component={OrderConfirmedScreen}
        options={{ animation: 'fade' }}
      />
      <RootStack.Screen name="SellerDashboard" component={SellerDashboardScreen} />
      <RootStack.Screen name="SellerMenu" component={SellerMenuScreen} />
      <RootStack.Screen name="SellerMenuItemForm" component={SellerMenuItemFormScreen} />
      <RootStack.Screen name="SellerStoreHours" component={SellerStoreHoursScreen} />
      <RootStack.Screen
        name="SellerNotificationPreferences"
        component={SellerNotificationPreferencesScreen}
      />
      <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <RootStack.Screen name="AdminModeration" component={AdminModerationScreen} />
      <RootStack.Screen
        name="AdminModerationDetail"
        component={AdminModerationDetailScreen}
      />
      <RootStack.Screen name="AdminDispatchBoard" component={AdminDispatchBoardScreen} />
      <RootStack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} />
      <RootStack.Screen name="AdminSLABreach" component={AdminSLABreachScreen} />
      <RootStack.Screen
        name="AdminNotificationPreferences"
        component={AdminNotificationPreferencesScreen}
      />
      <RootStack.Screen name="RiderLogin" component={RiderLoginScreen} />
      <RootStack.Screen name="RiderOTPVerify" component={RiderOTPVerifyScreen} />
      <RootStack.Screen name="RiderDashboard" component={RiderDashboardScreen} />
      <RootStack.Screen name="RiderTaskDetail" component={RiderTaskDetailScreen} />
      <RootStack.Screen name="RiderEarnings" component={RiderEarningsScreen} />
      <RootStack.Screen name="RiderHistory" component={RiderHistoryScreen} />
      <RootStack.Screen name="LocationEntry" component={LocationEntryScreen} />
      <RootStack.Screen name="ErrorCenter" component={ErrorCenterScreen} />
    </RootStack.Navigator>
  );
};

export const AppNavigator: React.FC = () => {
  const { theme } = useTheme();
  const { colors: themedColors, isDark } = theme;
  const session = useAuthStore(state => state.session);
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);
  const hasInitialized = useAuthStore(state => state.hasInitialized);
  const initialize = useAuthStore(state => state.initialize);
  const handleSessionChange = useAuthStore(state => state.handleSessionChange);

  useEffect(() => {
    void initialize();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      void handleSessionChange(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initialize, handleSessionChange]);

  useEffect(() => {
    if (!user?.id) {
      notificationService.cleanup();
      return;
    }

    void notificationService.initIfPreviouslyAllowed(user.id);
  }, [user?.id]);

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: themedColors.primary,
          background: themedColors.background,
          card: themedColors.surface,
          text: themedColors.textPrimary,
          border: themedColors.border,
          notification: themedColors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: themedColors.primary,
          background: themedColors.background,
          card: themedColors.surface,
          text: themedColors.textPrimary,
          border: themedColors.border,
          notification: themedColors.primary,
        },
      };

  const isProfileComplete = Boolean(profile?.name?.trim());
  const role = profile?.role || 'customer';

  return (
    <NavigationContainer theme={navigationTheme}>
      {!hasInitialized ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !session ? (
        <AuthNavigator />
      ) : !isProfileComplete ? (
        <ProfileSetupNavigator />
      ) : role === 'restaurant_owner' ? (
        <RestaurantOwnerNavigator />
      ) : role === 'rider' ? (
        <RiderRoleNavigator />
      ) : role === 'admin' ? (
        <AdminNavigator />
      ) : (
        <MainAppNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
