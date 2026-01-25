import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList, NotaFiscal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { sgpService } from '../services/sgpService';
import { config } from '../config';

type NotasFiscaisScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotasFiscais'>;

interface Props {
  navigation: NotasFiscaisScreenNavigationProp;
}

export const NotasFiscaisScreen: React.FC<Props> = ({ navigation }) => {
  console.log('[NotasFiscaisScreen] Componente renderizado');
  const { user, activeContract } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotasFiscais = useCallback(async () => {
    console.log('[NotasFiscaisScreen] fetchNotasFiscais chamado');
    console.log('[NotasFiscaisScreen] user?.cpfCnpj:', user?.cpfCnpj);
    console.log('[NotasFiscaisScreen] activeContract?.id:', activeContract?.id);
    console.log('[NotasFiscaisScreen] activeContract?.centralPassword:', activeContract?.centralPassword ? 'existe' : 'não existe');
    
    if (!user?.cpfCnpj || !activeContract?.id || !activeContract?.centralPassword) {
      console.log('[NotasFiscaisScreen] Dados insuficientes, parando busca');
      setLoading(false);
      return;
    }

    try {
      console.log('[NotasFiscaisScreen] Chamando sgpService.listarNotasFiscais');
      const notas = await sgpService.listarNotasFiscais(
        user.cpfCnpj,
        activeContract.id,
        activeContract.centralPassword
      );
      console.log('[NotasFiscaisScreen] Notas recebidas:', notas.length);
      setNotasFiscais(notas);
    } catch (error) {
      console.error('[NotasFiscaisScreen] Erro ao buscar notas fiscais:', error);
      Alert.alert('Erro', 'Não foi possível carregar as notas fiscais.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.cpfCnpj, activeContract?.id, activeContract?.centralPassword]);

  useEffect(() => {
    fetchNotasFiscais();
  }, [fetchNotasFiscais]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotasFiscais();
  }, [fetchNotasFiscais]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  const getStatusText = (status: number) => {
    // Status 2 parece ser emitida/ativa baseado nos dados
    if (status === 2) return 'Emitida';
    if (status === 0) return 'Cancelada';
    return 'Desconhecido';
  };

  const getStatusColor = (status: number) => {
    if (status === 2) return colors.success;
    if (status === 0) return colors.error;
    return colors.textSecondary;
  };

  const handleDownload = async (link: string) => {
    try {
      const canOpen = await Linking.canOpenURL(link);
      if (canOpen) {
        await Linking.openURL(link);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o link da nota fiscal.');
      }
    } catch (error) {
      console.error('Erro ao abrir link:', error);
      Alert.alert('Erro', 'Não foi possível abrir o link da nota fiscal.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando notas fiscais...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notasFiscais.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notas Fiscais</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView 
          contentContainerStyle={styles.emptyContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={80}
              color={config.primaryColor || '#E60000'}
            />
            <Text style={styles.emptyTitle}>Sem notas fiscais</Text>
            <Text style={styles.emptyMessage}>
              Você não possui notas fiscais disponíveis no momento.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notas Fiscais</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {notasFiscais.map((nota, index) => (
          <Card key={index} style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.notaNumber}>
                    NF-e {nota.numero}/{nota.serie}
                  </Text>
                  <Text style={styles.notaModelo}>Modelo {nota.modelo}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(nota.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(nota.status) }]}>
                    {getStatusText(nota.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText}>
                  Emitida em {formatDate(nota.data_emissao)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="currency-usd" size={16} color={colors.textSecondary} />
                <Text style={styles.valorTotal}>
                  {formatCurrency(nota.valortotal)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="office-building" size={16} color={colors.textSecondary} />
                <Text style={styles.infoText} numberOfLines={2}>
                  {nota.empresa_nome_fantasia || nota.empresa_razao_social}
                </Text>
              </View>

              <View style={styles.divider} />

              <Button
                mode="contained"
                onPress={() => handleDownload(nota.link)}
                style={styles.downloadButton}
                icon="download"
                buttonColor={colors.primary}
                textColor="#FFFFFF"
                labelStyle={styles.downloadButtonText}
              >
                Baixar Nota Fiscal
              </Button>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: config.primaryColor || '#E60000',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
    fontSize: 16,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  notaNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  notaModelo: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
    flex: 1,
  },
  valorTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  downloadButton: {
    marginTop: 8,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
