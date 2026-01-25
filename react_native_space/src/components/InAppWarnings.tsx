import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Modal } from 'react-native';
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
  const [errorModal, setErrorModal] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });
  const { user, activeContract } = useAuth();
  const { colors } = useTheme();
  
  const SUPPORT_PHONE = '5594984024089'; // Número do suporte para erros de validação

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
        let errorMessage = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.error || errorData?.message || `Erro ${response.status}`;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || `Erro ${response.status}`;
        }
        console.log('Error response:', response.status, errorMessage);
        
        // Se for erro 403, mostra modal customizado
        if (response.status === 403) {
          setErrorModal({ visible: true, message: errorMessage });
        } else {
          Alert.alert('Erro', `Erro ao buscar avisos: ${response.status} - ${errorMessage}`);
        }
      }
    } catch (error) {
      console.log('Error fetching warnings:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      Alert.alert('Erro', `Erro de conexão: ${errorMsg}`);
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

  const openWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${config.providerPhone}`);
  };
  
  const openSupportWhatsApp = (errorMessage: string) => {
    const message = `Olá, estou com problemas ao validar meu acesso. Erro: ${errorMessage}`;
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
    <>
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
                  onPress={openWhatsApp}
                >
                  <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Falar no WhatsApp</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
      
      {/* Modal de erro de validação */}
      <Modal
        visible={errorModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: '' })}
      >
        <View style={errorModalStyles.overlay}>
          <View style={errorModalStyles.container}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={config.primaryColor || '#E60000'} style={{ marginBottom: 16 }} />
            <Text style={errorModalStyles.title}>Problemas ao validar o seu acesso</Text>
            <Text style={errorModalStyles.message}>
              Entre em contato com o suporte
            </Text>
            <TouchableOpacity
              style={[errorModalStyles.whatsappButton, { backgroundColor: '#25D366' }]}
              onPress={() => {
                openSupportWhatsApp(errorModal.message);
                setErrorModal({ visible: false, message: '' });
              }}
            >
              <MaterialCommunityIcons name="whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={errorModalStyles.buttonText}>Falar com Suporte</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={errorModalStyles.closeButton}
              onPress={() => setErrorModal({ visible: false, message: '' })}
            >
              <Text style={errorModalStyles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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

const errorModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1F1F1F',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
    width: '100%',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: '#888',
    fontSize: 14,
  },
});
