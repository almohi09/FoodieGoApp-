import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useRiderStore } from '../store/riderStore';
import { Colors } from '../theme';
import { RiderHomeScreen } from '../screens/rider/RiderHomeScreen/index';
import { RiderEarningsScreen } from '../screens/rider/RiderEarningsScreen/index';
import { RiderHistoryScreen } from '../screens/rider/RiderHistoryScreen/index';
import { RiderProfileScreen } from '../screens/rider/RiderProfileScreen/index';
import { RiderOnboardingScreen } from '../screens/rider/RiderOnboardingScreen/index';

type RiderTabParamList = {
  RiderHome: undefined;
  RiderEarnings: undefined;
  RiderHistory: undefined;
  RiderProfile: undefined;
};

type RiderStackParamList = {
  RiderTabs: undefined;
  RiderOnboarding: undefined;
};

const Tab = createBottomTabNavigator<RiderTabParamList>();
const Stack = createNativeStackNavigator<RiderStackParamList>();

const RiderTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, focused }) => {
        const icon =
          route.name === 'RiderHome'
            ? focused
              ? 'bicycle'
              : 'bicycle-outline'
            : route.name === 'RiderEarnings'
              ? focused
                ? 'wallet'
                : 'wallet-outline'
              : route.name === 'RiderHistory'
                ? focused
                  ? 'time'
                  : 'time-outline'
                : focused
                  ? 'person'
                  : 'person-outline';

        return <Icon name={icon as never} size={22} color={color} />;
      },
      tabBarActiveTintColor: Colors.PRIMARY,
      tabBarInactiveTintColor: Colors.TEXT_TERTIARY,
      tabBarStyle: {
        backgroundColor: Colors.BG_PRIMARY,
        borderTopColor: Colors.BORDER,
        borderTopWidth: 0.5,
        height: 60,
        paddingTop: 6,
        paddingBottom: 6,
      },
      tabBarLabelStyle: {
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen name="RiderHome" component={RiderHomeScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="RiderEarnings" component={RiderEarningsScreen} options={{ title: 'Earnings' }} />
    <Tab.Screen name="RiderHistory" component={RiderHistoryScreen} options={{ title: 'History' }} />
    <Tab.Screen name="RiderProfile" component={RiderProfileScreen} options={{ title: 'Profile' }} />
  </Tab.Navigator>
);

export const RiderNavigator: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const initialize = useRiderStore(state => state.initialize);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const resolveRider = async () => {
    if (!profile?.id) {
      setNeedsOnboarding(true);
      setLoading(false);
      return;
    }

    const exists = await initialize(profile.id);
    setNeedsOnboarding(!exists);
    setLoading(false);
  };

  useEffect(() => {
    void resolveRider();
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.PRIMARY} />
        <Text style={{ marginTop: 8 }}>Loading rider profile...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {needsOnboarding ? (
        <Stack.Screen name="RiderOnboarding">
          {() => <RiderOnboardingScreen onCompleted={() => void resolveRider()} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="RiderTabs" component={RiderTabs} />
      )}
    </Stack.Navigator>
  );
};

export default RiderNavigator;
