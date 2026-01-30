import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Contract } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  contract: Contract;
  onPress: () => void;
}

export const ContractListItem: React.FC<Props> = ({ contract, onPress }) => {
  const { colors } = useTheme();
  
  // Usar cores do tema para status
  const isSuspended = contract.status === 'suspended' || contract.status === 'inactive' || contract.status === 'blocked';
  const badgeColor = isSuspended ? colors.warning : colors.success;

  const containerStyle = {
    backgroundColor: colors.cardBackground,
    borderBottomColor: colors.border,
  };

  return (
    <TouchableOpacity 
      style={[styles.container, containerStyle]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <Text style={[styles.name, { color: colors.text }]}>{contract.clientName?.toUpperCase()}</Text>
        <Text style={[styles.contractNumber, { color: colors.textSecondary }]}>Contrato: {contract.number || contract.id}</Text>
      </View>
      
      <View style={styles.rightContent}>
        <View style={[styles.badge, { backgroundColor: badgeColor }]}>
          <Text style={styles.badgeText}>{contract.id}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  leftContent: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contractNumber: {
    fontSize: 14,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
