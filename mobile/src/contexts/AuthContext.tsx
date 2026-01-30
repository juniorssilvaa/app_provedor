import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthContextData {
  user: User | null;
  loading: boolean;
  rememberCpf: boolean;
  setRememberCpf: (value: boolean) => void;
  login: (user: User, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const STORAGE_USER_KEY = '@OnFly:user';
const STORAGE_REMEMBER_KEY = '@OnFly:rememberCpf';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rememberCpf, setRememberCpf] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [storedUser, storedRemember] = await Promise.all([
        AsyncStorage.getItem(STORAGE_USER_KEY),
        AsyncStorage.getItem(STORAGE_REMEMBER_KEY),
      ]);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
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

  const login = async (userData: User, remember: boolean) => {
    try {
      setUser(userData);
      setRememberCpf(remember);

      await AsyncStorage.multiSet([
        [STORAGE_USER_KEY, JSON.stringify(userData)],
        [STORAGE_REMEMBER_KEY, remember.toString()],
      ]);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const updateUser = async (userData: User) => {
    try {
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error updating user data:', error);
    }
  };

  const logout = async () => {
    try {
      const shouldRemember = rememberCpf;
      setUser(null);

      await AsyncStorage.removeItem(STORAGE_USER_KEY);
      
      if (!shouldRemember) {
        await AsyncStorage.removeItem(STORAGE_REMEMBER_KEY);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        rememberCpf,
        setRememberCpf,
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