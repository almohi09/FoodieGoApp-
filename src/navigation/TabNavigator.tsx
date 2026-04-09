import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import type { CustomerTabParamList } from '@/types/navigation.types';
import { HomeScreen } from '@/screens/home';
import { OrdersScreen } from '@/screens/orders';
import { RewardsScreen } from '@/screens/main/RewardsScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { Colors } from '@/theme';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export const TabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: Colors.PRIMARY,
      tabBarInactiveTintColor: Colors.TEXT_TERTIARY,
      tabBarStyle: {
        height: 60,
        borderTopColor: Colors.BORDER,
        borderTopWidth: 0.5,
        backgroundColor: Colors.BG_PRIMARY,
        paddingTop: 6,
        paddingBottom: 6,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
      tabBarIcon: ({ focused, color }) => {
        const icon =
          route.name === 'Home'
            ? focused
              ? 'home'
              : 'home-outline'
            : route.name === 'Orders'
              ? focused
                ? 'receipt'
                : 'receipt-outline'
              : route.name === 'Rewards'
                ? focused
                  ? 'gift'
                  : 'gift-outline'
                : focused
                  ? 'person'
                  : 'person-outline';
        return <Icon name={icon as never} size={22} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Orders" component={OrdersScreen} />
    <Tab.Screen name="Rewards" component={RewardsScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default TabNavigator;

