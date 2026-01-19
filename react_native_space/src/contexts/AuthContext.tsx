import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { config } from '../config';
import axios from 'axios';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { useConfig } from './ConfigContext'; 
import { sgpService } from '../services/sgpService'; // Adicionado para buscar dados atualizados

interface AuthContextData {
  user: User | null;
  loading: boolean;
  rememberCpf: boolean;
  setRememberCpf: (value: boolean) => void;
  activeContractId: string | null;
  activeContract: User['contracts'][number] | null;
  selectContract: (contractId: string) => Promise<void>;
  login: (user: User, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_USER_KEY = '@NANET:user';
const STORAGE_REMEMBER_KEY = '@NANET:rememberCpf';
const STORAGE_ACTIVE_CONTRACT_ID_KEY = '@NANET:activeContractId';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberCpf, setRememberCpf] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);

  useEffect(() => {
    loadStoredData();
  }, []);

  const registerDeviceOnBackend = async (userData: User) => {
    try {
      const pushToken = await registerForPushNotificationsAsync();
      
      const payload = {
        provider_token: config.apiToken,
        cpf: userData.cpfCnpj,
        name: userData.name,
        email: userData.email,
        customer_id: userData.contracts?.[0]?.id, // Envia o primeiro contrato como referência
        device_platform: Platform.OS,
        device_model: Device.modelName,
        device_os: Device.osVersion,
        device_timestamp: new Date().toISOString(),
        push_token: pushToken
      };

      await axios.post(`${config.apiBaseUrl}app/register/`, payload);
      console.log('Dispositivo e usuário registrados no backend com sucesso.');
    } catch (error) {
      console.warn('Falha ao registrar dispositivo no backend:', error);
    }
  };

  const loadStoredData = async () => {
    try {
      const [storedUser, storedRemember, storedActiveContractId] = await Promise.all([
        AsyncStorage.getItem(STORAGE_USER_KEY),
        AsyncStorage.getItem(STORAGE_REMEMBER_KEY),
        AsyncStorage.getItem(STORAGE_ACTIVE_CONTRACT_ID_KEY),
      ]);

      if (storedUser) {
        const parsed = JSON.parse(storedUser) as User;
        setUser(parsed);

        // Atualiza o token de push em background sempre que abrir o app logado
        registerDeviceOnBackend(parsed);

        // BUSCAR TUDO: Atualiza os dados do SGP em background para garantir que faturas/contratos estejam em dia
        console.log('Atualizando dados do cliente em background...');
        sgpService.consultaCliente(parsed.cpfCnpj).then(updatedUser => {
            if (updatedUser) {
                setUser(updatedUser);
                AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(updatedUser));
                console.log('Dados do cliente atualizados com sucesso.');
            }
        }).catch(err => console.warn('Falha ao atualizar dados em background:', err));

        let nextActiveContractId: string | null = null;
        if (parsed.contracts?.length === 1) {
          nextActiveContractId = parsed.contracts[0]?.id ?? null;
        } else if (storedActiveContractId && parsed.contracts?.some((c) => c.id === storedActiveContractId)) {
          nextActiveContractId = storedActiveContractId;
        }

        setActiveContractId(nextActiveContractId);
        if (nextActiveContractId && nextActiveContractId !== storedActiveContractId) {
          await AsyncStorage.setItem(STORAGE_ACTIVE_CONTRACT_ID_KEY, nextActiveContractId);
        }
      }

      if (storedRemember) {
        setRememberCpf(storedRemember === 'true');
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectContract = async (contractId: string) => {
    setActiveContractId(contractId);
    await AsyncStorage.setItem(STORAGE_ACTIVE_CONTRACT_ID_KEY, contractId);
  };

  const { refreshConfig } = useConfig(); // Importar do contexto

  const login = async (userData: User, remember: boolean) => {
    try {
      // Atualiza configuração ao logar para garantir atalhos novos
      refreshConfig();
      
      setUser(userData);
      setRememberCpf(remember);

      const nextActiveContractId = userData.contracts?.length === 1 ? userData.contracts[0]?.id ?? null : null;
      setActiveContractId(nextActiveContractId);

      await AsyncStorage.multiSet([
        [STORAGE_USER_KEY, JSON.stringify(userData)],
        [STORAGE_REMEMBER_KEY, remember.toString()],
      ]);

      // Chama a função unificada de registro
      await registerDeviceOnBackend(userData);

      if (nextActiveContractId) {
        await AsyncStorage.setItem(STORAGE_ACTIVE_CONTRACT_ID_KEY, nextActiveContractId);
      } else {
        await AsyncStorage.removeItem(STORAGE_ACTIVE_CONTRACT_ID_KEY);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const updateUser = async (userData: User) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));

      if (activeContractId && !userData.contracts?.some((c) => c.id === activeContractId)) {
        setActiveContractId(null);
        await AsyncStorage.removeItem(STORAGE_ACTIVE_CONTRACT_ID_KEY);
      }

      if (!activeContractId && userData.contracts?.length === 1) {
        const onlyId = userData.contracts[0]?.id ?? null;
        if (onlyId) {
          setActiveContractId(onlyId);
          await AsyncStorage.setItem(STORAGE_ACTIVE_CONTRACT_ID_KEY, onlyId);
        }
      }
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const logout = async () => {
    try {
      const shouldRemember = rememberCpf;
      setUser(null);
      setActiveContractId(null);

      await AsyncStorage.removeItem(STORAGE_USER_KEY);
      await AsyncStorage.removeItem(STORAGE_ACTIVE_CONTRACT_ID_KEY);
      
      if (!shouldRemember) {
        await AsyncStorage.removeItem(STORAGE_REMEMBER_KEY);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const activeContract =
    user?.contracts?.find((c) => c.id === activeContractId) ??
    (user?.contracts?.length === 1 ? user.contracts[0] : null) ??
    null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        rememberCpf,
        setRememberCpf,
        activeContractId,
        activeContract,
        selectContract,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
