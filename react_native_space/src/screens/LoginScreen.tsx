import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Snackbar } from 'react-native-paper';
import MaskInput, { Masks } from 'react-native-mask-input';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { validateCPForCNPJ } from '../utils/validation';
import { LoadingOverlay } from '../components';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { config } from '../config';

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const STORAGE_CPF_KEY = '@NANET:savedCpf';

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login } = useAuth();
  
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
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

  const handleLogin = async () => {
    if (!validateCPForCNPJ(cpfCnpj)) {
      setError('Informe um CPF ou CNPJ válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Buscar dados reais da API
      const user = await sgpService.consultaCliente(cpfCnpj);

      if (!user) {
        setError('Cliente não encontrado');
        setLoading(false);
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
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleHelp = useCallback(() => {
    const message = 'Olá, preciso de ajuda com o acesso ao aplicativo.';
    const phone = config.providerPhone;
    Linking.canOpenURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`).then(supported => {
      if (supported) {
        Linking.openURL(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`);
      } else {
        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
      }
    });
  }, []);

  const isCpf = cpfCnpj.replace(/\D/g, '').length <= 11;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo-nanet.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>Acesse sua conta</Text>
            <Text style={styles.subtitle}>
              Informe seu CPF ou CNPJ para começar
            </Text>

            <MaskInput
              value={cpfCnpj}
              onChangeText={(masked) => setCpfCnpj(masked)}
              mask={isCpf ? Masks.BRL_CPF : Masks.BRL_CNPJ}
              keyboardType="numeric"
              placeholder="CPF/CNPJ"
              placeholderTextColor="#888"
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]} />
              <Text style={styles.checkboxText}>
                Lembrar meu CPF/CNPJ neste dispositivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'ENTRANDO...' : 'ENTRAR'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.helpButton} onPress={handleHelp}>
              <Text style={styles.helpText}>Precisa de ajuda?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => navigation.navigate('Plans')}
            >
              <Text style={styles.footerText}>Ver planos</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && <LoadingOverlay message="Fazendo login..." />}

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={{ color: '#FFFFFF' }}>{error}</Text>
      </Snackbar>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 300,
    height: 200,
  },
  formContainer: {
    width: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 24,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    borderRadius: 6,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: '#141414',
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#666666',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#D60000',
    borderColor: '#D60000',
  },
  checkboxText: {
    color: '#CCCCCC',
    fontSize: 13,
  },
  loginButton: {
    height: 50,
    backgroundColor: '#D60000',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  helpButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  helpText: {
    color: '#D60000',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  footerButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#9A9A9A',
    fontSize: 13,
    textAlign: 'center',
  },
  snackbar: {
    backgroundColor: colors.error || '#D60000',
  },
});
