import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../store/authStore';
import { useOwnerStore } from '../store/ownerStore';
import { Colors } from '../theme';
import {
  DashboardScreen,
  MenuScreen,
  OwnerOrderDetailScreen,
  OwnerOrdersScreen,
  OwnerProfileScreen,
} from '../screens/owner';

type OwnerTabParamList = {
  OwnerDashboard: undefined;
  OwnerOrders: undefined;
  OwnerMenu: undefined;
  OwnerProfile: undefined;
};

type OwnerStackParamList = {
  RestaurantOwnerTabs: undefined;
  OwnerOrderDetail: { orderId: string };
};

const Tab = createBottomTabNavigator<OwnerTabParamList>();
const Stack = createNativeStackNavigator<OwnerStackParamList>();

const OwnerTabs: React.FC = () => {
  const pendingOrdersCount = useOwnerStore(state => state.pendingOrdersCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
      tabBarIcon: ({ focused, color }) => {
          const icon =
            route.name === 'OwnerDashboard'
              ? focused
                ? 'bar-chart'
                : 'bar-chart-outline'
              : route.name === 'OwnerOrders'
                ? focused
                  ? 'notifications'
                  : 'notifications-outline'
                : route.name === 'OwnerMenu'
                  ? focused
                    ? 'list'
                    : 'list-outline'
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
      <Tab.Screen name="OwnerDashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen
        name="OwnerOrders"
        component={OwnerOrdersScreen}
        options={{
          title: 'Orders',
          tabBarBadge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
        }}
      />
      <Tab.Screen name="OwnerMenu" component={MenuScreen} options={{ title: 'Menu' }} />
      <Tab.Screen name="OwnerProfile" component={OwnerProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

export const RestaurantOwnerNavigator: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const fetchCurrentRestaurant = useOwnerStore(state => state.fetchCurrentRestaurant);

  useEffect(() => {
    if (profile?.id) {
      void fetchCurrentRestaurant(profile.id);
    }
  }, [fetchCurrentRestaurant, profile?.id]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RestaurantOwnerTabs" component={OwnerTabs} />
      <Stack.Screen name="OwnerOrderDetail" component={OwnerOrderDetailScreen} />
    </Stack.Navigator>
  );
};

export default RestaurantOwnerNavigator;
