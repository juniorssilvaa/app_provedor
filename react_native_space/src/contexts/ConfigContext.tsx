import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { config } from '../config';
import { sgpService } from '../services/sgpService';

interface AppConfigData {
  provider_name: string;
  primary_color: string;
  logo_url: string | null;
  active_shortcuts: string[];
  active_tools: string[];
  social_links: any[];
  update_warning_active: boolean;
  is_active: boolean;
  sgp_url?: string;
  sgp_token?: string;
  sgp_app_name?: string;
}

export interface ConfigErrorInfo {
  status: number;
  message: string;
}

interface ConfigContextData {
  appConfig: AppConfigData | null;
  isLoading: boolean;
  configError: ConfigErrorInfo | null;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextData>({} as ConfigContextData);

export const ConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appConfig, setAppConfig] = useState<AppConfigData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<ConfigErrorInfo | null>(null);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      const url = `${config.apiBaseUrl}public/config/?provider_token=${config.apiToken}`;
      
      // Timeout para evitar travamentos
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setConfigError(null);
        setAppConfig(data);
        if (data.sgp_url && data.sgp_token && data.sgp_app_name) {
          sgpService.setSGPCredentials(data.sgp_url, data.sgp_token, data.sgp_app_name);
        }
      } else {
        let message = `Erro ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error && typeof body.error === 'string') message = body.error;
        } catch {
          // ignore
        }
        setConfigError({ status: response.status, message });
        setAppConfig(null);
        console.error('Failed to fetch app config', response.status, message);
      }
    } catch (error: any) {
      // Tratamento mais robusto de erros
      let message = 'Falha de rede ao carregar a configuração.';
      if (error.name === 'AbortError') {
        message = 'Timeout ao carregar configuração.';
      } else if (error?.message) {
        message = error.message;
      }
      setConfigError({ status: 0, message });
      setAppConfig(null);
      console.error('Error fetching app config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={{ appConfig, isLoading, configError, refreshConfig: fetchConfig }}>
      {configError && !isLoading ? (
        <ConfigErrorView
          error={configError}
          isLoading={isLoading}
          onRetry={fetchConfig}
        />
      ) : (
        children
      )}
    </ConfigContext.Provider>
  );
};

const ConfigErrorView: React.FC<{
  error: ConfigErrorInfo;
  isLoading: boolean;
  onRetry: () => Promise<void>;
}> = ({ error, isLoading, onRetry }) => {
  const primary = config.primaryColor || '#E60000';
  const SUPPORT_PHONE = '5594984024089'; // Número do suporte para erros de validação
  
  const openSupportWhatsApp = () => {
    const message = `Olá, estou com problemas ao validar meu acesso. Erro: ${error.message}`;
    const url = `whatsapp://send?phone=${SUPPORT_PHONE}&text=${encodeURIComponent(message)}`;
    Linking.canOpenURL('whatsapp://send').then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`);
      }
    });
  };
  
  return (
    <View style={configErrorStyles.container}>
      <MaterialCommunityIcons name="alert-circle" size={48} color={primary} style={{ marginBottom: 16 }} />
      <Text style={configErrorStyles.title}>
        {error.status === 403 ? 'Problemas ao validar o seu acesso' : 'Erro ao carregar configuração'}
      </Text>
      <Text style={configErrorStyles.message}>
        {error.status === 403 ? 'Entre em contato com o suporte' : error.message}
      </Text>
      
      {error.status === 403 && (
        <TouchableOpacity
          style={[configErrorStyles.whatsappButton, { backgroundColor: '#25D366' }]}
          onPress={openSupportWhatsApp}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={configErrorStyles.buttonText}>Falar com Suporte</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity
        style={[configErrorStyles.button, { backgroundColor: primary }]}
        onPress={onRetry}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={configErrorStyles.buttonText}>Tentar novamente</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const configErrorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#111',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#CCC',
    textAlign: 'center',
    marginBottom: 24,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 200,
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 180,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export const useConfig = () => useContext(ConfigContext);
