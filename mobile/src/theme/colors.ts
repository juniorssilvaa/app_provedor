import { DarkTheme } from '@react-navigation/native';

export const colors = {
  primary: '#E60000', // Nanet Red
  darkBackground: '#121212', // Neutral Dark (Black-ish)
  white: '#FFFFFF',
  textSecondary: '#B0B0B0', // Lighter grey for better contrast on dark
  cardBackground: '#1E1E1E', // Neutral Dark Grey
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
};

export const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.darkBackground,
    card: colors.cardBackground,
    text: colors.white,
    border: '#333333',
    notification: colors.primary,
  },
};