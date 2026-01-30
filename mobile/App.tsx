import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, Linking, Text, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { ConfigProvider } from './src/contexts/ConfigContext';
import { RootNavigator } from './src/navigation';
import { ErrorBoundary, PermissionHandler } from './src/components';

const NotificationPermissionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useTheme();
  const [status, setStatus] = React.useState<'checking' | 'granted' | 'denied'>('checking');
  const [requesting, setRequesting] = React.useState(false);

  const ensurePermission = React.useCallback(async () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      setStatus('granted');
      return;
    }

    setRequesting(true);
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.status === 'granted') {
        setStatus('granted');
        return;
      }
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.status === 'granted') {
        setStatus('granted');
      } else {
        setStatus('denied');
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  React.useEffect(() => {
    ensurePermission();
  }, [ensurePermission]);

  if (status === 'granted') {
    return <>{children}</>;
  }

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: colors.background,
      }}
    >
      {status === 'checking' || requesting ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <View style={{ width: '100%' }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: colors.text,
              textAlign: 'center',
              marginBottom: 16,
            }}
          >
            Permissão obrigatória
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.text,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            Para receber avisos importantes sobre sua internet e boletos, você precisa
            permitir notificações. O app só pode ser usado após conceder essa permissão.
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={ensurePermission}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 8,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              Permitir notificações
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => Linking.openSettings()}
            style={{
              paddingVertical: 10,
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 14,
                textAlign: 'center',
              }}
            >
              Abrir configurações do sistema
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const AppContent = () => {
  const { colors, isDark } = useTheme();

  const paperTheme = {
    ...(isDark ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(isDark ? MD3DarkTheme.colors : MD3LightTheme.colors),
      primary: colors.primary,
      background: colors.background,
      surface: colors.cardBackground,
      onBackground: colors.text,
      onSurface: colors.text,
      error: colors.error,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      <AuthProvider>
        <PermissionHandler />
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <NotificationPermissionGate>
          <RootNavigator />
        </NotificationPermissionGate>
      </AuthProvider>
    </PaperProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ConfigProvider>
          <ThemeProvider>
            <AppContent />
          </ThemeProvider>
        </ConfigProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
