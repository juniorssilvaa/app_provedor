import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../theme/colors';

type InvoiceStatus = 'paid' | 'overdue' | 'pending';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'overdue':
        return {
          label: 'Vencida',
          color: colors.error, // Assuming colors.error is defined as #FF4D4F or similar
          backgroundColor: 'rgba(244, 67, 54, 0.15)', // Light red
        };
      case 'pending':
        return {
          label: 'Aberta',
          color: colors.warning,
          backgroundColor: 'rgba(255, 152, 0, 0.15)', // Light orange
        };
      case 'paid':
        return {
          label: 'Paga',
          color: colors.success,
          backgroundColor: 'rgba(76, 175, 80, 0.15)', // Light green
        };
      default:
        return {
          label: status,
          color: colors.textSecondary,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor, borderColor: config.color }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase', // Optional: if you want VENCIDA/ABERTA/PAGA uppercase
  },
});
