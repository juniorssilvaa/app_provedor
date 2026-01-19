
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface PixRedButtonProps {
  onPress: () => void;
}

export const PixRedButton: React.FC<PixRedButtonProps> = ({ onPress }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, { backgroundColor: colors.error }]}>
      <View style={styles.content}>
        <MaterialCommunityIcons name="qrcode" size={24} color={colors.white} />
        <Text style={[styles.text, { color: colors.white }]}>Pagar com PIX</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
