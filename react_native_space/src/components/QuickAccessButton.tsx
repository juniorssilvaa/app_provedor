import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface QuickAccessButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress?: () => void;
}

export const QuickAccessButton: React.FC<QuickAccessButtonProps> = ({ icon, label, onPress }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <MaterialCommunityIcons name={icon} size={32} color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  label: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
});