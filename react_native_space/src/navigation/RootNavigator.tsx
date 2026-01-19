import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { LoginScreen, ContractsScreen, PlansScreen, InvoiceDetailsScreen, UsageScreen, PaymentPromiseScreen, InternetInfoScreen, SupportListScreen, SupportFormScreen, SpeedTestScreen, AIChatScreen } from '../screens';
import { BottomTabNavigator } from './BottomTabNavigator';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingOverlay, SplashLoading } from '../components';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { user, loading, activeContractId } = useAuth();
  const { navigationTheme } = useTheme();

  if (loading) {
    return <SplashLoading />;
  }

  // Determine initial route based on user state
  let initialRouteName: keyof RootStackParamList = 'MainTabs';

  if (!user) {
    initialRouteName = 'Login';
  } else if (user.contracts.length > 1 && !activeContractId) {
    initialRouteName = 'Contracts';
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        initialRouteName={initialRouteName}
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
        ) : user.contracts.length > 1 && !activeContractId ? (
          <>
            <Stack.Screen name="Contracts" component={ContractsScreen} />
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen name="Plans" component={PlansScreen} />
            <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
            <Stack.Screen name="Usage" component={UsageScreen} />
            <Stack.Screen name="PaymentPromise" component={PaymentPromiseScreen} />
            <Stack.Screen name="InternetInfo" component={InternetInfoScreen} />
            <Stack.Screen name="SupportList" component={SupportListScreen} />
            <Stack.Screen name="SupportForm" component={SupportFormScreen} />
            <Stack.Screen name="SpeedTest" component={SpeedTestScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} />
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
            <Stack.Screen name="SpeedTest" component={SpeedTestScreen} />
            <Stack.Screen name="AIChat" component={AIChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
