import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabsParamList, RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { HomeScreen, InvoicesScreen, ProfileScreen } from '../screens';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator<MainTabsParamList>();

// Empty component for the middle tab since we handle the button separately
const EmptyComponent = () => null;

export const BottomTabNavigator: React.FC = () => {
  const { activeContract } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const isSuspended = activeContract?.status === 'suspended' || activeContract?.status === 'inactive'; // Adjust status check as needed
  
  // Per user request: Green if active, Red if suspended
  const buttonColor = isSuspended ? colors.error : colors.success;

  const handleMiddleButtonPress = () => {
    if (activeContract?.status === 'active') {
      Alert.alert('Status', 'Seu contrato está ativo e funcionando normalmente.');
    } else {
      navigation.navigate('PaymentPromise');
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 45 : 50, // Maximum padding for clearance
          height: Platform.OS === 'ios' ? 110 : 110, // Increased height
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Início',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{
          tabBarLabel: 'Faturas',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="PaymentPromisePlaceholder"
        component={EmptyComponent}
        options={{
          tabBarLabel: 'Reativar',
          tabBarButton: (props) => (
            <TouchableOpacity
              style={[styles.middleButtonContainer, { marginTop: -20 }]}
              onPress={handleMiddleButtonPress}
            >
              <View style={[styles.middleButton, { backgroundColor: buttonColor }]}>
                <MaterialCommunityIcons name="lock-open-variant-outline" size={32} color="white" />
              </View>
            </TouchableOpacity>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            handleMiddleButtonPress();
          },
        }}
      />

      <Tab.Screen
        name="Support"
        component={EmptyComponent} 
        options={{
          tabBarLabel: 'Suporte',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="forum-outline" size={size} color={color} />
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('SupportList');
          },
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  middleButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  middleButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
