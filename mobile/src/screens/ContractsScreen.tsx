import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { CustomHeader, ContractCard } from '../components';

type ContractsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Contracts'>;

interface Props {
  navigation: ContractsScreenNavigationProp;
}

export const ContractsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CustomHeader title="Contratos" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {user?.contracts && user.contracts.length > 0 ? (
          <>
            <Text style={styles.subtitle}>
              Você tem {user.contracts.length} {user.contracts.length === 1 ? 'contrato' : 'contratos'}
            </Text>
            {user.contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                onPress={() => {
                  // Navigate to contract details
                  console.log('Contract pressed:', contract.id);
                }}
              />
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Nenhum contrato encontrado</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
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
