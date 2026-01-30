import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Checkbox, Snackbar, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { validateCPForCNPJ } from '../utils/validation';
import { LoadingOverlay } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const STORAGE_CPF_KEY = '@OnFly:savedCpf';

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login } = useAuth();
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSavedCpf();
  }, []);

  const loadSavedCpf = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_CPF_KEY);
      if (saved) {
        setCpfCnpj(saved);
        setRememberMe(true);
      }
    } catch (err) {
      console.error('Error loading saved CPF:', err);
    }
  };

  const formatCpfCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length <= 11) {
      // Format as CPF
      return cleaned
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      // Format as CNPJ
      return cleaned
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    }
  };

  const handleCpfCnpjChange = (text: string) => {
    const formatted = formatCpfCnpj(text);
    setCpfCnpj(formatted);
  };

  const handleLogin = async () => {
    try {
      setError('');

      // Validate CPF/CNPJ
      if (!validateCPForCNPJ(cpfCnpj)) {
        setError('CPF/CNPJ inválido');
        return;
      }

      setLoading(true);

      // Try to get user from API
      let user;
      try {
        user = await sgpService.consultaCliente(cpfCnpj);
      } catch (apiError: any) {
        console.log('API error, using mock data:', apiError.message);
        // If API fails, use mock data for demo
        user = sgpService.getMockUser(cpfCnpj);
      }

      if (!user) {
        setError('Cliente não encontrado');
        return;
      }

      // Save CPF if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem(STORAGE_CPF_KEY, cpfCnpj);
      } else {
        await AsyncStorage.removeItem(STORAGE_CPF_KEY);
      }

      // Login user
      await login(user, rememberMe);

      // Navigate to main app - handled automatically by AuthContext
      // navigation.replace('MainTabs');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Acesse sua conta</Text>
          <Text style={styles.subtitle}>
            Informe seu CPF ou CNPJ para começar
          </Text>

          {/* Input fields */}
          <TextInput
            mode="outlined"
            label="CPF/CNPJ"
            value={cpfCnpj}
            onChangeText={handleCpfCnpjChange}
            keyboardType="number-pad"
            maxLength={18}
            style={styles.input}
            outlineColor="rgba(255, 255, 255, 0.3)"
            activeOutlineColor={colors.primary}
            textColor={colors.white}
            theme={{
              colors: {
                onSurfaceVariant: colors.textSecondary,
              },
            }}
          />

          {/* Remember me checkbox */}
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
              color={colors.primary}
            />
            <Text style={styles.checkboxLabel}>Lembrar meu CPF/CNPJ neste dispositivo</Text>
          </View>

          {/* Login button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            buttonColor={colors.primary}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
            disabled={loading}
          >
            ENTRAR
          </Button>

          {/* Help link */}
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Precisa de ajuda?</Text>
          </TouchableOpacity>
        </View>

        {/* Footer links */}
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Plans')}
            style={styles.footerButton}
          >
            <Text style={styles.footerText}>Ver planos</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity style={styles.footerButton}>
            <Text style={styles.footerText}>Quero ser cliente</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {loading && <LoadingOverlay message="Fazendo login..." />}

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={{ color: colors.white }}>{error}</Text>
      </Snackbar>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 200,
    height: 140,
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.cardBackground,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
    marginLeft: 8,
  },
  loginButton: {
    marginBottom: 16,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerButton: {
    paddingHorizontal: 12,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
    marginHorizontal: 8,
  },
  snackbar: {
    backgroundColor: colors.error,
  },
});
