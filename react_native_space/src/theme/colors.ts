import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const darkColors = {
  primary: '#E60000', // Nanet Red
  darkBackground: '#121212', // Neutral Dark (Black-ish)
  white: '#FFFFFF',
  textSecondary: '#B0B0B0', // Lighter grey for better contrast on dark
  cardBackground: '#1E1E1E', // Neutral Dark Grey
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  background: '#121212',
  text: '#FFFFFF',
  border: '#333333',
};

export const lightColors = {
  primary: '#E60000', // Nanet Red
  darkBackground: '#F5F5F5', // Light Grey Background (keeping variable name for compatibility but value is light)
  white: '#000000', // Inverted for text
  textSecondary: '#666666', // Darker grey for contrast on light
  cardBackground: '#FFFFFF', // White cards
  success: '#2E7D32', // Darker green
  error: '#D32F2F', // Darker red
  warning: '#EF6C00', // Darker orange
  info: '#1976D2', // Darker blue
  background: '#F5F5F5',
  text: '#000000',
  border: '#E0E0E0',
};

// Default export for backward compatibility during refactor
export const colors = darkColors;

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.primary,
    background: darkColors.background,
    card: darkColors.cardBackground,
    text: darkColors.text,
    border: darkColors.border,
    notification: darkColors.primary,
  },
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.primary,
    background: lightColors.background,
    card: lightColors.cardBackground,
    text: lightColors.text,
    border: lightColors.border,
    notification: lightColors.primary,
  },
};
