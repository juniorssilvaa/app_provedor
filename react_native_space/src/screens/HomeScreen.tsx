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
import { MainTabsParamList, RootStackParamList, ServiceAccess } from '../types';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
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

const getSignalQuality = (strength: number | null) => {
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
            useNativeDriver: true,
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
  const { user, updateUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
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



  const activeContract = user?.contracts?.[0];
  const firstName = activeContract?.clientName ? activeContract.clientName.split(' ')[0] : '';

  const isSuspended = activeContract?.status === 'suspended' || activeContract?.status === 'inactive';
  const statusText = isSuspended ? 'SUSPENSO' : 'ATIVO';
  const statusBgColor = isSuspended ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)';
  const statusTextColor = isSuspended ? colors.error : colors.success;

  const allInvoices = useMemo(() => {
    if (!user?.contracts) return [];
    const invoices = [];
    for (const c of user.contracts) {
      if (c.invoices && c.invoices.length) {
        invoices.push(...c.invoices);
      }
    }
    // Sort by due date (descending)
    return invoices.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [user]);

  const lastInvoice = useMemo(() => {
    if (!allInvoices.length) return null;
    const overdue = allInvoices.filter(i => i.status === 'overdue').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    const pending = allInvoices.filter(i => i.status === 'pending').sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
    
    return overdue || pending || allInvoices[0];
  }, [allInvoices]);

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

  const getDayFromDate = (dateString?: string) => {
    if (!dateString) return '15'; // Default or fallback
    const date = new Date(dateString);
    return date.getDate().toString().padStart(2, '0');
  };

  const { percentage: signalPercentage, text: signalText, color: signalColor } = getSignalQuality(networkInfo.strength || null);
  const frequencyLabel = getFrequencyLabel(networkInfo.frequency || null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (user?.cpfCnpj) {
        const updatedUser = await sgpService.consultaCliente(user.cpfCnpj);
        if (updatedUser) {
          await updateUser(updatedUser);
        }
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.cpfCnpj, updateUser]);


  React.useEffect(() => {
    const loadServiceAccess = async () => {
      if (activeContract?.id) {
        const info = await sgpService.verificaAcesso(activeContract.id);
        setServiceAccess(info);
      }
    };
    loadServiceAccess();
  }, [activeContract?.id]);

  const invoiceStatusColor = lastInvoice?.status === 'overdue' 
    ? colors.error 
    : lastInvoice?.status === 'pending' 
      ? colors.warning 
      : colors.success;

  const invoiceStatusLabel = lastInvoice?.status === 'overdue'
    ? 'FATURA ATRASADA'
    : lastInvoice?.status === 'pending'
      ? 'FATURA ABERTA'
      : 'FATURA PAGA';

  const handleWhatsApp = () => {
    Linking.openURL('whatsapp://send?phone=5508000000000'); // Replace with actual number
  };

  const handlePhone = () => {
    Linking.openURL('tel:08000000000'); // Replace with actual number
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => (navigation as any).openDrawer?.()}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={{ width: 40, height: 40 }} 
            resizeMode="contain" 
          />
        </TouchableOpacity>
        
        <View style={styles.logoContainer} />
        
        <TouchableOpacity style={styles.headerButton}>
          <View>
            <MaterialCommunityIcons name="bell-outline" size={24} color={colors.white} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>2</Text>
            </View>
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account" size={40} color={colors.primary} />
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
                <Text style={[styles.invoiceStatusTitle, { color: invoiceStatusColor }]}>
                  {invoiceStatusLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.invoiceValueLarge}>{formatCurrency(lastInvoice.amount)}</Text>
            <Text style={styles.invoiceDueDate}>Vencimento {formatDate(lastInvoice.dueDate)}</Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.pixActionButton}
                onPress={() => navigation.navigate('InvoiceDetails', { invoice: lastInvoice })}
              >
                <Image 
                  source={require('../../assets/logo-pix-520x520.png')} 
                  style={{ width: 20, height: 20 }} 
                  resizeMode="contain"
                />
                <Text style={[styles.pixButtonText, { marginLeft: 8 }]}>Pagar com PIX</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('InvoiceDetails', { invoice: lastInvoice })}
              >
                <MaterialCommunityIcons name="barcode" size={24} color={colors.white} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('InvoiceDetails', { invoice: lastInvoice })}
              >
                <MaterialCommunityIcons name="credit-card-outline" size={24} color={colors.white} />
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
                Sinal: <Text style={{color: colors.white}}>{signalPercentage}%</Text> <Text style={{color: signalColor}}>({signalText})</Text>
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
              <View style={{marginLeft: 8}}>
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

        {/* Downdetector Card */}
        <View style={styles.downdetectorCard}>
          <View style={styles.downdetectorHeader}>
            <MaterialCommunityIcons name="pulse" size={24} color={colors.error} />
            <Text style={styles.downdetectorTitle}>Downdetector</Text>
          </View>
          <Text style={styles.downdetectorText}>Problemas com a conexão? Verifique o status da rede ou entre em contato com o suporte.</Text>
          
          <View style={styles.downdetectorButtonsRow}>
            <TouchableOpacity 
              style={styles.checkStatusButton} 
              onPress={() => {
                if (activeContract?.status === 'active') {
                  Alert.alert('Status', 'Seu contrato está ativo e funcionando normalmente.');
                } else {
                  navigation.navigate('PaymentPromise');
                }
              }}
            >
              <MaterialCommunityIcons name="pulse" size={24} color={colors.darkBackground} />
              <Text style={styles.checkStatusButtonText}>Verificar Status</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconActionButton} onPress={handleWhatsApp}>
              <MaterialCommunityIcons name="whatsapp" size={24} color={colors.darkBackground} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.iconActionButton} onPress={handlePhone}>
              <MaterialCommunityIcons name="phone" size={24} color={colors.darkBackground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Access Grid */}
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickAccessGrid}>
          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Invoices')}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="barcode" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Faturas</Text>
          </TouchableOpacity>

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
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="lock-open-variant-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Reativar</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('SupportList')}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="headset" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Suporte</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Usage')}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="chart-line" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Consumo</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => {}}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="bell-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Avisos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('InternetInfo')}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="router-wireless" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Modem</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => navigation.navigate('Contracts')}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>Contrato</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAccessItem}
            onPress={() => {}}
          >
            <View style={styles.quickAccessIcon}>
              <MaterialCommunityIcons name="speedometer" size={28} color={colors.primary} />
            </View>
            <Text style={styles.quickAccessLabel}>SpeedTest</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
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
    color: colors.white,
    letterSpacing: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: colors.white,
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
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  contractLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  statusBadgeContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeStatusText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  versionText: {
    position: 'absolute',
    top: 50,
    right: 16,
    fontSize: 10,
    color: colors.textSecondary,
  },
  planInfoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  planInfoText: {
    color: colors.white,
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
    padding: 20,
    marginBottom: 16,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceStatusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  reactivateButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reactivateButtonText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  invoiceValueLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  invoiceDueDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pixActionButton: {
    flex: 1,
    backgroundColor: 'rgba(244, 67, 54, 0.8)', // Pink/Reddish color from image
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  pixButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  iconButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  connectionCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    marginBottom: 80,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  connectionHeaderTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  connectionSSID: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 12,
  },
  connectionInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  connectionInfoLeft: {
    flex: 1,
  },
  connectionSignalText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  frequencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  frequencyText: {
    color: colors.textSecondary,
    fontSize: 14,
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
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  downdetectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  downdetectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  downdetectorText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  downdetectorButtonsRow: {
    flexDirection: 'row',
  },
  checkStatusButton: {
    flex: 1,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
  },
  checkStatusButtonText: {
    color: colors.darkBackground,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  iconActionButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 16,
    marginLeft: 4,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 80,
  },
  quickAccessItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 24,
  },
  quickAccessIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#252B3D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAccessLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
});
