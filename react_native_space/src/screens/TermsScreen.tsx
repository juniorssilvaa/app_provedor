import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { Text, Button, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { RootStackParamList, TermoAceite } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { sgpService } from '../services/sgpService';

type TermsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Terms'>;

interface Props {
  navigation: TermsScreenNavigationProp;
}

export const TermsScreen: React.FC<Props> = ({ navigation }) => {
  const { activeContract } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [termo, setTermo] = useState<TermoAceite | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [aceito, setAceito] = useState(false);

  const fetchTermo = useCallback(async () => {
    if (!activeContract?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log('[TermsScreen] Buscando termo de aceite');
      const termoData = await sgpService.buscarTermoAceite(activeContract.id);
      if (termoData) {
        setTermo(termoData);
        setAceito(termoData.aceite_status);
      } else {
        Alert.alert('Erro', 'Não foi possível carregar o termo de aceite.');
      }
    } catch (error) {
      console.error('[TermsScreen] Erro ao buscar termo:', error);
      Alert.alert('Erro', 'Não foi possível carregar o termo de aceite.');
    } finally {
      setLoading(false);
    }
  }, [activeContract?.id]);

  useEffect(() => {
    fetchTermo();
  }, [fetchTermo]);

  const handleAccept = async () => {
    if (!activeContract?.id) {
      Alert.alert('Erro', 'Informações do contrato não disponíveis.');
      return;
    }

    if (!aceito) {
      Alert.alert('Atenção', 'Você precisa marcar a opção de aceite antes de confirmar.');
      return;
    }

    setAccepting(true);
    try {
      const result = await sgpService.aceitarTermoAceite(activeContract.id);
      if (result.success) {
        Alert.alert('Sucesso', 'Termo aceito com sucesso!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        // Atualiza o status local
        if (termo) {
          setTermo({ ...termo, aceite_status: true });
        }
        setAceito(true);
      } else {
        Alert.alert('Erro', result.msg || 'Não foi possível aceitar o termo.');
      }
    } catch (error) {
      console.error('[TermsScreen] Erro ao aceitar termo:', error);
      Alert.alert('Erro', 'Não foi possível aceitar o termo.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Termo de Adesão</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Carregando termo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!termo) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Termo de Adesão</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="file-document-outline"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>Termo não disponível</Text>
          <Text style={styles.emptyMessage}>
            Não foi possível carregar o termo de aceite.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Extrair o conteúdo HTML do termo
  const htmlContent = termo.html || '';

  // Função para extrair texto do HTML
  const extractTextFromHTML = (html: string): string => {
    if (!html) return '';
    // Remove tags HTML e decodifica entidades básicas
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove todas as tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Remove espaços múltiplos
      .trim();
    return text;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termo de Adesão</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Status do Aceite */}
        {termo.aceite_status && (
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.statusText, { color: colors.success }]}>
              Termo já aceito
            </Text>
          </View>
        )}

        {/* Container para exibir o HTML do termo */}
        <View style={styles.htmlContainer}>
          <ScrollView 
            style={styles.htmlScrollView}
            contentContainerStyle={styles.htmlContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={styles.htmlText}>
              {extractTextFromHTML(htmlContent)}
            </Text>
          </ScrollView>
        </View>

        {/* Checkbox de Aceite */}
        {!termo.aceite_status && (
          <View style={styles.acceptContainer}>
            <Checkbox
              status={aceito ? 'checked' : 'unchecked'}
              onPress={() => setAceito(!aceito)}
              color={colors.primary}
            />
            <Text style={styles.acceptText} onPress={() => setAceito(!aceito)}>
              Eu, {termo.cliente_nome}, aceito os termos do contrato.
            </Text>
          </View>
        )}

        {/* Botão de Confirmar */}
        {!termo.aceite_status && (
          <Button
            mode="contained"
            onPress={handleAccept}
            style={styles.acceptButton}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
            labelStyle={styles.acceptButtonText}
            loading={accepting}
            disabled={accepting || !aceito}
          >
            {accepting ? 'Confirmando...' : 'Confirmar'}
          </Button>
        )}
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
    backgroundColor: colors.cardBackground,
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
    color: colors.text,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  htmlContainer: {
    minHeight: 300,
    maxHeight: 600,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  htmlScrollView: {
    flex: 1,
  },
  htmlContent: {
    padding: 16,
  },
  htmlText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333333',
  },
  acceptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
  },
  acceptText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: 8,
  },
  acceptButton: {
    marginTop: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
