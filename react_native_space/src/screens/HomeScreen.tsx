import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Dimensions,
  LayoutChangeEvent,
  Linking,
  AppState,
  Alert,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { MainTabsParamList, RootStackParamList, ServiceAccess } from '../types';
import { InAppWarnings, PixIconRed, PulseIcon } from '../components';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConfig } from '../contexts/ConfigContext';
import { ensureLocationPermission, getNetworkInfo, NetworkInfo } from '../utils/networkUtils';
import { sgpService } from '../services/sgpService';
import packageJson from '../../package.json';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const getSignalQuality = (strength: number | null, colors: any) => {
  if (strength === null) return { percentage: 0, text: 'Indisponível', color: colors.textSecondary };
  // Convert dBm to Percentage
  // Typical range: -100 dBm (0%) to -50 dBm (100%)
  const percentage = Math.min(Math.max(2 * (strength + 100), 0), 100);
  let text = 'Fraco';
  let color = colors.error;
  if (percentage >= 80) {
    text = 'Excelente';
    color = colors.success;
  } else if (percentage >= 60) {
    text = 'Bom';
    color = colors.success;
  } else if (percentage >= 40) {
    text = 'Regular';
    color = colors.warning;
  }
  return { percentage, text, color };
};

const getFrequencyLabel = (freq: number | null) => {
  if (!freq) return '';
  if (freq >= 4900) return '5 GHz';
  if (freq >= 2400) return '2.4 GHz';
  return `${freq} MHz`;
};

const MarqueeText = ({ text, style }: { text: string; style?: any }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const handleTextLayout = (e: LayoutChangeEvent) => {
    setTextWidth(e.nativeEvent.layout.width);
  };

  const handleContainerLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      const duration = textWidth * 20; // Adjust speed here (higher = slower)
      const startAnimation = () => {
        animatedValue.setValue(containerWidth);
        Animated.loop(
          Animated.timing(animatedValue, {
            toValue: -textWidth,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: false,
          })
        ).start();
      };
      startAnimation();
    } else {
      animatedValue.setValue(0);
    }
  }, [textWidth, containerWidth, animatedValue]);

  return (
    <View style={[styles.marqueeContainer, { flex: 1, overflow: 'hidden' }]} onLayout={handleContainerLayout}>
      <Animated.Text
        style={[
          style,
          {
            transform: [{ translateX: animatedValue }],
            width: textWidth > containerWidth ? undefined : '100%',
          },
        ]}
        numberOfLines={1}
        onLayout={handleTextLayout}
      >
        {text}
      </Animated.Text>
    </View>
  );
};

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { user, activeContract, updateUser } = useAuth();
  const { colors } = useTheme();
  const { appConfig, refreshConfig } = useConfig();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isShortcutActive = useCallback(
    (shortcutName: string) => {
      if (!appConfig) return true;
      return appConfig.active_shortcuts.includes(shortcutName);
    },
    [appConfig]
  );

  const isToolActive = useCallback(
    (toolName: string) => {
      if (!appConfig) return true;
      return appConfig.active_tools.includes(toolName);
    },
    [appConfig]
  );

  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const didShowLocationPermissionAlert = useRef(false);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    ssid: null,
    ipAddress: null,
    connected: false,
    type: 'unknown',
    isInternetReachable: false,
    strength: null,
    frequency: null,
    linkSpeed: null,
    rxLinkSpeed: null,
    txLinkSpeed: null,
  });
  const insets = useSafeAreaInsets();
  const [serviceAccess, setServiceAccess] = useState<ServiceAccess | null>(null);

  const fetchNetworkInfo = useCallback(async () => {
    const status = await ensureLocationPermission();
    if (status !== 'granted' && !didShowLocationPermissionAlert.current) {
      didShowLocationPermissionAlert.current = true;
      Alert.alert(
        'Permissão necessária',
        'Para mostrar o nome da rede Wi‑Fi (SSID) e dados de conexão, o Android exige permissão de Localização. Ative para continuar.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
        ]
      );
    }
    const info = await getNetworkInfo();
    setNetworkInfo(info);
  }, []);

  useEffect(() => {
    fetchNetworkInfo();
    // Poll for signal strength updates every 2 seconds to make the bar dynamic
    const intervalId = setInterval(() => {
      fetchNetworkInfo();
    }, 2000);
    // Subscribe to network state updates for real-time signal changes
    const unsubscribeNetInfo = NetInfo.addEventListener(() => {
      fetchNetworkInfo();
    });
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchNetworkInfo();
      }
    });
    return () => {
      clearInterval(intervalId);
      subscription.remove();
      unsubscribeNetInfo();
    };
  }, [fetchNetworkInfo]);

  useFocusEffect(
    useCallback(() => {
      fetchNetworkInfo();
    }, [fetchNetworkInfo])
  );

  const firstName = activeContract?.clientName ? activeContract.clientName.split(' ')[0] : '';
  const isSuspended = activeContract?.status === 'suspended' || activeContract?.status === 'inactive';
  const statusText = isSuspended ? 'SUSPENSO' : 'ATIVO';
  const statusBgColor = isSuspended ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)';
  const statusTextColor = isSuspended ? colors.error : colors.success;

  const lastInvoice = useMemo(() => {
    if (!activeContract?.invoices || activeContract.invoices.length === 0) return null;
    // Get all pending invoices (not paid)
    const pendingInvoices = activeContract.invoices
      .filter(inv => inv.status !== 'paid')
      .sort((a, b) => {
        // Sort by due date ascending (closest to today first)
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        return dateA - dateB;
      });
    // If no pending, return the most recent paid one?
    // Actually, user wants to pay, so pending is better.
    if (pendingInvoices.length > 0) {
      return pendingInvoices[0];
    }
    // Fallback to most recent paid if none pending
    return [...activeContract.invoices].sort(
      (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
    )[0];
  }, [activeContract]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    // Handle "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY" format directly
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}/)) {
      return dateString.split(' ')[0];
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('pt-BR');
  };

  const handlePixCopy = async () => {
    // Busca a chave PIX em múltiplas localizações conforme estrutura da API SGP
    console.log('Last Invoice:', JSON.stringify(lastInvoice, null, 2));
    
    // Primeiro tenta buscar na lastInvoice
    let pixKey =
      lastInvoice?.codigopix || // Primeiro tenta codigopix direto (minúscula como vem da API)
      lastInvoice?.codigoPix || // Depois codigoPix (maiúscula)
      lastInvoice?.pixCode || // Fallback para pixCode genérico, se vier de outro backend
      (lastInvoice as any)?.links?.[0]?.codigopix || // Dentro de links[0].codigopix
      (lastInvoice as any)?.links?.[0]?.codigoPix || // Dentro de links[0].codigoPix
      '';
    
    // Se não encontrou na lastInvoice, busca em outras invoices pendentes que tenham PIX
    if (!pixKey || pixKey.trim().length === 0) {
      console.log('PIX não encontrado na lastInvoice, buscando em outras invoices pendentes...');
      const pendingInvoices = activeContract?.invoices?.filter(inv => inv.status !== 'paid') || [];
      for (const inv of pendingInvoices) {
        const invPixKey =
          inv.codigopix ||
          inv.codigoPix ||
          inv.pixCode ||
          (inv as any)?.links?.[0]?.codigopix ||
          (inv as any)?.links?.[0]?.codigoPix ||
          '';
        if (invPixKey && invPixKey.trim().length > 0) {
          pixKey = invPixKey;
          console.log('PIX encontrado em outra invoice:', inv.id);
          break;
        }
      }
    }
    
    console.log('PIX Key encontrada:', pixKey ? 'SIM' : 'NÃO', pixKey ? pixKey.substring(0, 50) + '...' : '');
    if (pixKey && pixKey.trim().length > 0) {
      await Clipboard.setStringAsync(pixKey.trim());
      Alert.alert('Sucesso', 'Chave PIX copiada para a área de transferência!');
    } else {
      Alert.alert('Aviso', 'Chave PIX indisponível para esta fatura.');
    }
  };

  const handleBarcodeCopy = async () => {
    const barcode = lastInvoice?.linhaDigitavel;
    if (barcode && barcode.trim().length > 0) {
      await Clipboard.setStringAsync(barcode.trim());
      Alert.alert('Sucesso', 'Código de barras copiado para a área de transferência!');
    } else {
      Alert.alert('Aviso', 'Código de barras indisponível para esta fatura.');
    }
  };

  const getDayFromDate = (dateString?: string) => {
    if (!dateString) return '15'; // Default or fallback
    const date = new Date(dateString);
    return date.getDate().toString().padStart(2, '0');
  };

  const { percentage: signalPercentage, text: signalText, color: signalColor } = getSignalQuality(
    networkInfo.strength || null,
    colors
  );
  const frequencyLabel = getFrequencyLabel(networkInfo.frequency || null);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    
    const refreshData = async () => {
      try {
        // 1. Atualiza as configurações do App (Botões, Cores, etc.)
        await refreshConfig();
        // 2. Atualiza dados do usuário (Faturas, Contratos, etc.)
        const currentCpf = user?.cpfCnpj;
        if (currentCpf) {
          const updatedUser = await sgpService.consultaCliente(currentCpf);
          if (updatedUser) {
            await updateUser(updatedUser);
          }
        }
      } catch (error) {
        console.error('Error refreshing data:', error);
      } finally {
        setRefreshing(false);
      }
    };

    refreshData();
  }, [user, updateUser, refreshConfig]);

  React.useEffect(() => {
    const loadServiceAccess = async () => {
      if (activeContract?.id) {
        const info = await sgpService.verificaAcesso(activeContract.id);
        setServiceAccess(info);
      }
    };
    loadServiceAccess();
  }, [activeContract?.id]);

  const invoiceStatusColor =
    lastInvoice?.status === 'overdue'
      ? colors.error
      : lastInvoice?.status === 'pending'
      ? colors.warning
      : colors.success;
  const invoiceStatusLabel =
    lastInvoice?.status === 'overdue'
      ? 'FATURA ATRASADA'
      : lastInvoice?.status === 'pending'
      ? 'FATURA ABERTA'
      : 'FATURA PAGA';

  const handleWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=558182337720');
  };

  const handlePhone = () => {
    Linking.openURL('tel:+558182337720');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => (navigation as any).openDrawer?.()}>
          <Image
            source={require('../../assets/icon.png')}
            style={{ width: 450, height: 110, marginLeft: 40 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.logoContainer} />
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('Support')}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={28} color={colors.white} />
            {warningsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{warningsCount > 9 ? '9+' : warningsCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <InAppWarnings refreshTrigger={refreshTrigger} onWarningsCount={setWarningsCount} />

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
              <MaterialCommunityIcons name="account" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.userInfo}>
              <View style={styles.contractRow}>
                <View style={styles.contractBadge}>
                  <Text style={styles.contractLabel}>Contrato: {activeContract?.id}</Text>
                </View>
                <View style={[styles.statusBadgeContainer, { backgroundColor: statusBgColor }]}>
                  <Text style={[styles.activeStatusText, { color: statusTextColor }]}>{statusText}</Text>
                </View>
              </View>
              <Text style={styles.userName}>{firstName || 'Cliente'}</Text>
            </View>
          </View>
          <Text style={styles.versionText}>Versão: {packageJson.version}</Text>

          <View style={styles.planInfoContainer}>
            <View style={styles.planInfoRow}>
              <Text style={styles.planInfoText}>
                {activeContract?.plan?.name?.replace('FIBRA ', '') || 'PREMIUM 300MB'}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.planInfoText}>
                VENC. {activeContract?.invoices?.[0] ? getDayFromDate(activeContract.invoices[0].dueDate) : '15'}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.planInfoText}>
                {activeContract?.dataCadastro ? formatDate(activeContract.dataCadastro) : ''}
              </Text>
            </View>
            <View style={styles.addressContainer}>
              <MarqueeText
                text={activeContract?.address || 'RUA MANOEL MARQUES DA CUNHA, 339 - MAR...'}
                style={styles.addressText}
              />
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
            </View>
          </View>
        </View>

        {/* Invoice Card */}
        {lastInvoice && (
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceCardHeader}>
              <View style={styles.invoiceStatusRow}>
                <MaterialCommunityIcons
                  name={lastInvoice.status === 'overdue' ? 'alert-circle-outline' : 'check-circle-outline'}
                  size={20}
                  color={invoiceStatusColor}
                />
                <Text style={[styles.invoiceStatusTitle, { color: invoiceStatusColor }]}>{invoiceStatusLabel}</Text>
              </View>
            </View>
            <Text style={styles.invoiceValueLarge}>{formatCurrency(lastInvoice.amount)}</Text>
            <Text style={styles.invoiceDueDate}>Vencimento {formatDate(lastInvoice.dueDate)}</Text>
            <View style={styles.invoiceActions}>
              <TouchableOpacity style={styles.pixActionButton} onPress={handlePixCopy}>
                <PixIconRed size={20} color="#FFFFFF" />
                <Text style={styles.pixActionText}>Pagar com PIX</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: '#FF0000' }]}
                onPress={handleBarcodeCopy}
              >
                <MaterialCommunityIcons name="barcode" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: '#FF0000', marginLeft: 12 }]}
                onPress={() => navigation.navigate('InvoiceDetails', { invoice: lastInvoice })}
              >
                <MaterialCommunityIcons name="credit-card-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Connection Card */}
        <View style={styles.connectionCard}>
          {/* Header */}
          <View style={styles.connectionHeader}>
            <MaterialCommunityIcons name="wifi" size={20} color={colors.primary} />
            <Text style={styles.connectionHeaderTitle}>WI-FI</Text>
          </View>
          {/* SSID */}
          <Text style={styles.connectionSSID}>
            {networkInfo.ssid || (networkInfo.connected ? 'Wi-Fi Conectado' : 'Desconectado')}
          </Text>
          {/* Info Row */}
          <View style={styles.connectionInfoRow}>
            <View style={styles.connectionInfoLeft}>
              <Text style={styles.connectionSignalText}>
                Sinal: <Text style={{ color: colors.white }}>{signalPercentage}%</Text>{' '}
                <Text style={{ color: signalColor }}>({signalText})</Text>
              </Text>
              {frequencyLabel ? (
                <View style={styles.frequencyContainer}>
                  <MaterialCommunityIcons name="wifi" size={14} color={colors.primary} />
                  <Text style={styles.frequencyText}>{frequencyLabel}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.connectionInfoRight}>
              <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.primary} />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.ipLabel}>IP Local</Text>
                <Text style={styles.ipValue}>{networkInfo.ipAddress || '---'}</Text>
              </View>
            </View>
          </View>
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${signalPercentage}%`, backgroundColor: signalColor }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelText}>0%</Text>
            <Text style={styles.progressLabelText}>100%</Text>
          </View>
        </View>

        {/* AI Assistant Card */}
        {isToolActive('DOWN DETECTOR') && (
          <View style={styles.downdetectorCard}>
            <View style={styles.downdetectorHeader}>
              <MaterialCommunityIcons name="robot" size={24} color={colors.primary} />
              <Text style={styles.downdetectorTitle}>Assistente IA</Text>
            </View>
            <Text style={styles.downdetectorText}>
              Suporte inteligente para seu Wi-Fi e financeiro.
            </Text>
            <View style={styles.downdetectorButtonsRow}>
              <TouchableOpacity
                style={styles.checkStatusButton}
                onPress={() => navigation.navigate('AIChat')}
              >
                <MaterialCommunityIcons name="chat-processing" size={24} color="#FFFFFF" />
                <Text style={styles.checkStatusButtonText}>Falar com Assistente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconActionButton, { backgroundColor: colors.primary }]}
                onPress={handleWhatsApp}
              >
                <MaterialCommunityIcons name="whatsapp" size={24} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconActionButton, { backgroundColor: colors.primary }]}
                onPress={handlePhone}
              >
                <MaterialCommunityIcons name="phone" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Access Grid */}
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickAccessGrid}>
          {isShortcutActive('FATURAS') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Invoices')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="barcode" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Faturas</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('PROMESSAS DE PAGAMENTO') && (
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => {
                if (activeContract?.status === 'active') {
                  Alert.alert('Atenção', 'Contrato está ativo.');
                } else {
                  navigation.navigate('PaymentPromise');
                }
              }}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="lock-open-variant-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Reativar</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('CHAMADOS') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('SupportList')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="headset" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Suporte</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('CONSUMO') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Usage')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="chart-line" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Consumo</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('NOTAS FISCAIS') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Invoices')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="receipt" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Notas Fiscais</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('STREAMING') && (
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => Alert.alert('Em breve', 'Funcionalidade de Streaming estará disponível em breve.')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="play-box-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Streaming</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('ATENDIMENTO') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('SupportList')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="face-agent" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Atendimento</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('TERMOS') && (
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => Alert.alert('Em breve', 'Visualização de termos estará disponível em breve.')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="file-sign" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Termos</Text>
            </TouchableOpacity>
          )}
          {isToolActive('MEU ROTEADOR') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('InternetInfo')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="router-wireless" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Modem</Text>
            </TouchableOpacity>
          )}
          {isShortcutActive('PLANOS') && (
            <TouchableOpacity style={styles.quickAccessItem} onPress={() => navigation.navigate('Contracts')}>
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="file-document-outline" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>Contrato</Text>
            </TouchableOpacity>
          )}
          {isToolActive('SPEED TEST') && (
            <TouchableOpacity
              style={styles.quickAccessItem}
              onPress={() => navigation.navigate('SpeedTest')}
            >
              <View style={[styles.quickAccessIcon, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="speedometer" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickAccessLabel}>SpeedTest</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoContainer: {
      flex: 1,
      alignItems: 'center',
    },
    logoText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 1,
    },
    notificationBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: colors.error,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: colors.primary,
    },
    notificationText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: 'bold',
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    userCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      // Add shadow if needed
    },
    userHeader: {
      flexDirection: 'row',
      marginBottom: 8,
    },
    avatarContainer: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.primary + '1A', // 10% opacity
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    userInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    contractRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    contractBadge: {
      backgroundColor: colors.textSecondary + '1A',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    contractLabel: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    statusBadgeContainer: {
      backgroundColor: colors.success + '33',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    activeStatusText: {
      color: colors.success,
      fontSize: 10,
      fontWeight: 'bold',
    },
    userName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    versionText: {
      position: 'absolute',
      top: 50,
      right: 16,
      fontSize: 10,
      color: colors.textSecondary,
    },
    planInfoContainer: {
      backgroundColor: colors.background, // Adaptive
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    planInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    planInfoText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    divider: {
      width: 1,
      height: 12,
      backgroundColor: colors.textSecondary,
    },
    marqueeContainer: {
      flex: 1,
      marginRight: 8,
    },
    addressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    addressText: {
      color: colors.textSecondary,
      fontSize: 12,
      flex: 1,
      marginRight: 8,
    },
    invoiceCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    invoiceCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    invoiceStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    invoiceStatusTitle: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: 'bold',
    },
    invoiceValueLarge: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    invoiceDueDate: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 16,
    },
    invoiceActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
    },
    pixActionButton: {
      backgroundColor: '#FF0000',
      flexShrink: 1,
      flexGrow: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginRight: 12,
      elevation: 4,
      shadowColor: '#FF0000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    pixActionText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: 'bold',
      marginLeft: 10,
    },
    iconButton: {
      width: 50,
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    connectionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    connectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    connectionHeaderTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    connectionSSID: {
      color: colors.text,
      fontSize: 14,
      marginBottom: 16,
    },
    connectionInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    connectionInfoLeft: {
      flex: 1,
    },
    connectionSignalText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 8,
    },
    frequencyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    frequencyText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginLeft: 4,
    },
    connectionInfoRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ipLabel: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    ipValue: {
      color: colors.text,
      fontSize: 14,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: colors.background,
      borderRadius: 4,
      marginBottom: 8,
    },
    progressBarFill: {
      height: 8,
      borderRadius: 4,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressLabelText: {
      color: colors.textSecondary,
      fontSize: 12,
    },
    downdetectorCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    downdetectorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    downdetectorTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    downdetectorText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 16,
    },
    downdetectorButtonsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    checkStatusButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FF0000',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      flex: 1,
      marginRight: 8,
    },
    checkStatusButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    iconActionButton: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 12,
      marginLeft: 4,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    quickAccessGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickAccessItem: {
      width: '30%',
      alignItems: 'center',
      marginBottom: 16,
    },
    quickAccessIcon: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.primary + '1A',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickAccessLabel: {
      color: colors.text,
      fontSize: 12,
      textAlign: 'center',
    },
  });
