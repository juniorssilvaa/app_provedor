import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Contract } from '../types';

interface ContractCardProps {
  contract: Contract;
  onPress?: () => void;
  selected?: boolean;
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract, onPress, selected }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isSuspended = contract.status === 'suspended' || contract.status === 'inactive';
  const statusText = isSuspended ? 'SUSPENSO' : 'ATIVO';
  const statusBgColor = isSuspended ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)';
  const statusTextColor = isSuspended ? colors.error : colors.success;

  return (
    <TouchableOpacity
      style={[styles.container, selected ? styles.containerSelected : undefined]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
        <Text style={[styles.statusText, { color: statusTextColor }]}>{statusText}</Text>
      </View>

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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  containerSelected: {
    borderColor: colors.primary,
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '1A',
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
    color: colors.text,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
});
