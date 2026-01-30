import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Contract } from '../types';

interface ContractCardProps {
  contract: Contract;
  onPress?: () => void;
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={32} color={colors.primary} />
      </View>
      
      <View style={styles.content}>
        <Text style={styles.contractNumber}>Contrato {contract.number}</Text>
        <Text style={styles.clientName}>{contract.clientName}</Text>
        <View style={styles.planContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{contract.plan.type}</Text>
          </View>
          <Text style={styles.planName}>{contract.plan.name}</Text>
        </View>
      </View>
      
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  contractNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  planContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 12,
    color: colors.white,
    flex: 1,
  },
});