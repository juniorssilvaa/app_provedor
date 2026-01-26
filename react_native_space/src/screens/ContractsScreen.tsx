import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ContractCard, CustomHeader } from '../components';

type ContractsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Contracts'>;

interface Props {
  navigation: ContractsScreenNavigationProp;
}

export const ContractsScreen: React.FC<Props> = ({ navigation }) => {
  const { user, selectContract, logout } = useAuth();
  const { colors } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const handleLogout = useCallback(() => {
    // Prevenir múltiplos cliques e múltiplos alerts
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    Alert.alert(
      'Sair',
      'Deseja sair do app?',
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
  }, [isLoggingOut, logout]);

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <CustomHeader 
        title="CONTRATOS" 
        showBack={canGoBack}
        rightComponent={
          <TouchableOpacity onPress={handleLogout}>
             <MaterialCommunityIcons name="exit-to-app" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Quantidade: <Text style={styles.summaryCount}>{user?.contracts?.length || 0}</Text>
          </Text>
        </View>

        {user?.contracts && user.contracts.length > 0 ? (
          <View style={styles.listContainer}>
            {user.contracts.map((contract, index) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onPress={async () => {
                  await selectContract(contract.id);
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  });
                }}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nenhum contrato encontrado</Text>
          </View>
        )}
      </ScrollView>
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
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  summaryContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: colors.text,
  },
  summaryCount: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
