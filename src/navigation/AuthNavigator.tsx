import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Profile } from '../api';
import type { AuthStackParamList, NavigatorScreens } from './route-types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator({
  screens,
  onLogin,
}: {
  screens: Pick<NavigatorScreens, 'Login'>;
  onLogin: (profile: Profile) => void;
}) {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login">
          {() => <screens.Login onLogin={onLogin} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
