import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import { useTheme } from '../contexts/ThemeContext';

interface Warning {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  whatsapp_btn?: string | null;
  sticky: boolean;
  show_home: boolean;
  created_at: string;
}

interface Props {
  refreshTrigger?: any;
  onWarningsCount?: (count: number) => void;
}

export const InAppWarnings: React.FC<Props> = ({ refreshTrigger, onWarningsCount }) => {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const { user, activeContract } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    fetchWarnings();
  }, [user, activeContract, refreshTrigger]);

  const fetchWarnings = async () => {
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('provider_token', config.apiToken || '');
      if (user && user.cpfCnpj) params.append('cpf', user.cpfCnpj);
      if (activeContract && activeContract.id) params.append('contract_id', activeContract.id.toString());
      
      console.log(`Fetching warnings from: ${config.apiBaseUrl}public/warnings/?${params.toString()}`);
      
      const response = await fetch(`${config.apiBaseUrl}public/warnings/?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = (await response.json()) as Warning[];
        console.log('Warnings received:', JSON.stringify(data));
        
        // Showing all fetched warnings regardless of show_home flag for now, 
        // as we don't have a separate warnings screen yet.
        setWarnings(data);
        if (onWarningsCount) {
          onWarningsCount(data.length);
        }
      } else {
        const errorText = await response.text();
        console.log('Error response:', response.status, errorText);
        Alert.alert('Debug Warning', `Erro ao buscar avisos: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.log('Error fetching warnings:', error);
      Alert.alert('Debug Warning', `Erro de conexão: ${error}`);
    }
  };

  if (warnings.length === 0) return null;

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'success': return { icon: 'check-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'warning': return { icon: 'alert', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' };
      case 'critical': return { icon: 'alert-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' };
      default: return { icon: 'information', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' };
    }
  };

  const openWhatsApp = (number: string) => {
    Linking.openURL(`whatsapp://send?phone=${number}`);
  };

  return (
    <View style={styles.container}>
      {warnings.map((warning) => {
        const { icon, color, bg } = getIconAndColor(warning.type);
        return (
          <View key={warning.id} style={[styles.card, { backgroundColor: bg, borderColor: color }]}>
            <View style={styles.header}>
              <MaterialCommunityIcons name={icon as any} size={24} color={color} />
              <Text style={[styles.title, { color: colors.text }]}>{warning.title}</Text>
            </View>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{warning.message}</Text>
            
            {warning.whatsapp_btn && (
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: color }]}
                onPress={() => openWhatsApp(warning.whatsapp_btn!)}
              >
                <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Falar no WhatsApp</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
