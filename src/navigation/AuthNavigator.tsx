import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/types/navigation.types';
import {
  AdminLoginScreen,
  LoginScreen,
  LoginOptionsScreen,
  OnboardingScreen,
  OTPVerifyScreen,
  PhoneEntryScreen,
  SellerLoginScreen,
  SellerRegisterScreen,
  SplashScreen,
  SignupScreen,
  UserRegisterScreen,
} from '@/screens/auth';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => (
  <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Splash" component={SplashScreen} />
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="LoginOptions" component={LoginOptionsScreen} />
    <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} />
    <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="UserRegister" component={UserRegisterScreen} />
    <Stack.Screen name="SellerLogin" component={SellerLoginScreen} />
    <Stack.Screen name="SellerRegister" component={SellerRegisterScreen} />
    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;

