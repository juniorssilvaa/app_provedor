import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Plan } from '../types';

interface PlanCardProps {
  plan: Plan;
  onSelect?: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onSelect }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showDescription, setShowDescription] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name="wifi" size={32} color={colors.white} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{plan.type}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.speedContainer}>
        <View style={styles.speedItem}>
          <MaterialCommunityIcons name="download" size={20} color={colors.primary} />
          <Text style={styles.speedLabel}>Down {plan.downloadSpeed} Mb/s</Text>
        </View>
        <View style={styles.speedItem}>
          <MaterialCommunityIcons name="upload" size={20} color={colors.primary} />
          <Text style={styles.speedLabel}>Up {plan.uploadSpeed} Mb/s</Text>
        </View>
      </View>
      
      {plan.price !== undefined && (
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Por apenas</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>R$ {plan.price.toFixed(2).replace('.', ',')}</Text>
          </View>
        </View>
      )}

      {showDescription && plan.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{plan.description}</Text>
        </View>
      )}
      
      {plan.description && (
        <TouchableOpacity 
          style={styles.detailsButton} 
          onPress={() => setShowDescription(!showDescription)}
        >
          <Text style={styles.detailsButtonText}>
            {showDescription ? 'Ocultar Detalhes' : 'Detalhes'}
          </Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity style={styles.button} onPress={onSelect} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Quero este</Text>
        <MaterialCommunityIcons name="arrow-right" size={20} color={colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  speedContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  speedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  priceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  descriptionContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  detailsButton: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailsButton: {
    paddingVertical: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  detailsButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});