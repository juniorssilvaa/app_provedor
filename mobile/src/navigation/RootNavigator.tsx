import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { theme } from '../theme/colors';
import { LoginScreen, ContractsScreen, PlansScreen, InvoiceDetailsScreen, UsageScreen, PaymentPromiseScreen, InternetInfoScreen, SupportListScreen, SupportFormScreen } from '../screens';
import { BottomTabNavigator } from './BottomTabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { LoadingOverlay } from '../components';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingOverlay message="Carregando..." />;
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Plans" component={PlansScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen name="Contracts" component={ContractsScreen} />
            <Stack.Screen name="Plans" component={PlansScreen} />
            <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
            <Stack.Screen name="Usage" component={UsageScreen} />
            <Stack.Screen name="PaymentPromise" component={PaymentPromiseScreen} />
            <Stack.Screen name="InternetInfo" component={InternetInfoScreen} />
            <Stack.Screen name="SupportList" component={SupportListScreen} />
            <Stack.Screen name="SupportForm" component={SupportFormScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
