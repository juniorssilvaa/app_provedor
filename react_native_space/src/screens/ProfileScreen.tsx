import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainTabsParamList, RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { maskCPForCNPJ } from '../utils/validation';
import packageJson from '../../package.json';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { logout, user, activeContract } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const clientName = activeContract?.clientName || user?.name || 'Cliente';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const hasMultipleContracts = user?.contracts && user.contracts.length > 1;

  const handleLogout = useCallback(() => {
    // Prevenir múltiplos cliques
    if (isLoggingOut) return;
    
    if (hasMultipleContracts) {
      // Navigate to contract selection
      navigation.navigate('Contracts');
    } else {
      // Normal logout
      setIsLoggingOut(true);
      Alert.alert(
        'Sair',
        'Tem certeza que deseja sair?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setIsLoggingOut(false),
          },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Erro ao fazer logout:', error);
                setIsLoggingOut(false);
              }
            },
          },
        ],
        { 
          cancelable: true,
          onDismiss: () => setIsLoggingOut(false),
        }
      );
    }
  }, [hasMultipleContracts, isLoggingOut, logout, navigation]);

  const menuItems = [
    {
      icon: 'wallet-outline',
      title: 'Faturas',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      icon: 'file-document-outline',
      title: 'Notas Fiscais',
      onPress: () => {
        console.log('[ProfileScreen] Navegando para NotasFiscais');
        // Navega para o stack principal (fora da tab) - mesma forma que outras rotas
        navigation.navigate('NotasFiscais');
      },
    },
    {
      icon: 'cloud-off-outline',
      title: 'Reativar',
      onPress: () => {
        if (activeContract?.status === 'active') {
          Alert.alert('Status', 'Seu contrato está ativo e funcionando normalmente.');
        } else {
          navigation.navigate('PaymentPromise');
        }
      },
    },
    {
      icon: 'chat-processing-outline',
      title: 'Suporte',
      onPress: () => navigation.navigate('SupportList'), // Updated to navigate to SupportList
    },
    {
      icon: 'web',
      title: 'Internet',
      onPress: () => navigation.navigate('InternetInfo'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        
        {/* User Name Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.userNameText}>{clientName}</Text>
          {user?.cpfCnpj && (
            <Text style={styles.userCpfText}>{maskCPForCNPJ(user.cpfCnpj)}</Text>
          )}
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItemRow}
              onPress={item.onPress}
            >
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.menuLabelRow}>{item.title}</Text>
              <View style={{ flex: 1 }} />
              <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      {/* Footer Section */}
      <View style={styles.footer}>
        {/* Theme Toggle */}
        <View style={styles.themeToggleContainer}>
          <Text style={styles.themeToggleText}>Modo Escuro</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            color={colors.primary}
          />
        </View>

        <Text style={styles.versionText}>Versão {packageJson.version}</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.9}>
          <MaterialCommunityIcons name="exit-to-app" size={28} color={colors.white} style={styles.logoutIcon} />
          <View>
            <Text style={styles.logoutTitle}>
              {hasMultipleContracts ? 'Sair, ou' : 'Sair'}
            </Text>
            {hasMultipleContracts && (
              <Text style={styles.logoutSubtitle}>Alternar Contrato</Text>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <MaterialCommunityIcons name="chevron-right" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  menuList: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    // Add shadow for light mode
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuLabelRow: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 16,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  userCpfText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 50 : 30, // Minimal clearance
    backgroundColor: colors.background,
  },
  versionText: {
    textAlign: 'right',
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
    marginRight: 16,
  },
  logoutButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  logoutIcon: {
    marginRight: 16,
  },
  logoutTitle: {
    color: '#FFFFFF', // Always white on primary color button
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutSubtitle: {
    color: '#FFFFFF', // Always white
    fontSize: 14,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  themeToggleText: {
    color: colors.text,
    marginRight: 8,
    fontSize: 14,
  },
});
