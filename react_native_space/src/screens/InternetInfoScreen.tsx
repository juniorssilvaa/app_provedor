import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TextInput, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { sgpService } from '../services/sgpService';
import { SGPCpeResponse } from '../types';
import { getNetworkInfo, NetworkInfo } from '../utils/networkUtils';

export const InternetInfoScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, activeContract } = useAuth();
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [cpeInfo, setCpeInfo] = useState<SGPCpeResponse['info'] | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [loadingCpe, setLoadingCpe] = useState(true);
  const [cpeError, setCpeError] = useState<string | null>(null);
  
  // Wi-Fi Configuration State
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiSsid5, setWifiSsid5] = useState('');
  const [wifiPassword5, setWifiPassword5] = useState('');
  const [showPassword24, setShowPassword24] = useState(false);
  const [showPassword5, setShowPassword5] = useState(false);
  const [saving, setSaving] = useState(false);

  const isFocused = useIsFocused();

  const fetchData = useCallback(async () => {
    setLoadingCpe(true);
    setCpeError(null);
    try {
      const netInfo = await getNetworkInfo({ requestLocationPermission: true });
      setNetworkInfo(netInfo);

      if (activeContract) {
        try {
          const accessInfo = await sgpService.verificaAcesso(activeContract.id);
          
          if (accessInfo && accessInfo.serviceId) {
            setServiceId(accessInfo.serviceId);
            const data = await sgpService.consultarCpe(activeContract.id, accessInfo.serviceId);
            
            if (data && data.success && data.info) {
              setCpeInfo(data.info);
              setCpeError(null);
              
            // Pre-fill form with current values
            // Busca SSID também nos wlan_interfaces se disponível
            const ssid24FromInterface = data.info.interface_info?.wlan_interfaces?.find((iface: any) => 
              iface.frequency === '2.4GHz'
            )?.ssid;
            
            const ssid5FromInterface = data.info.interface_info?.wlan_interfaces?.find((iface: any) => 
              iface.frequency === '5GHz'
            )?.ssid;
            
            const password24FromInterface = data.info.interface_info?.wlan_interfaces?.find((iface: any) => 
              iface.frequency === '2.4GHz'
            )?.password;
            
            const password5FromInterface = data.info.interface_info?.wlan_interfaces?.find((iface: any) => 
              iface.frequency === '5GHz'
            )?.password;
            
            setWifiSsid(data.info.wifi_ssid || ssid24FromInterface || data.info.ssid || activeContract.wifiSSID || '');
            setWifiPassword(data.info.wifi_password || password24FromInterface || activeContract.wifiPassword || '');
            setWifiSsid5(data.info.wifi_ssid_5ghz || ssid5FromInterface || activeContract.wifiSSID5 || '');
            setWifiPassword5(data.info.wifi_password_5ghz || password5FromInterface || activeContract.wifiPassword5 || '');

              // Busca número real de dispositivos conectados do CPE
              // Prioriza lan_devices do interface_info, depois lan_devices direto
              let count: number | null = null;
              
              if (data.info.interface_info?.lan_devices && Array.isArray(data.info.interface_info.lan_devices)) {
                count = data.info.interface_info.lan_devices.length;
              } else if (Array.isArray(data.info.lan_devices)) {
                // Array vazio significa 0 dispositivos, não null
                count = data.info.lan_devices.length;
              } else if (data.info.online_host_num !== undefined && data.info.online_host_num !== null) {
                count = data.info.online_host_num;
              } else if (data.info.associated_device_num !== undefined && data.info.associated_device_num !== null) {
                count = data.info.associated_device_num;
              } else if (data.info.connected_devices !== undefined && data.info.connected_devices !== null) {
                count = data.info.connected_devices;
              } else if (Array.isArray(data.info.hosts)) {
                count = data.info.hosts.length;
              }
              
              // Se count for null, significa que não encontrou o campo, não que são 0 dispositivos
              // 0 dispositivos é um valor válido (array vazio)
              setDeviceCount(count);
            } else {
              // CPE não disponível ou sem sucesso
              // Não mostra mensagens técnicas de erro da API para o usuário
              // Apenas marca como não disponível silenciosamente
              const errorMsg = data?.msg || '';
              // Ignora mensagens sobre parâmetros obrigatórios (são para alteração, não consulta)
              if (errorMsg.includes('wifi_status') || errorMsg.includes('nova_senha') || errorMsg.includes('novo_ssid')) {
                // Erro relacionado a alteração, não deve aparecer na visualização
                setCpeError(null);
              } else {
                // Outros erros podem ser exibidos, mas de forma amigável
                setCpeError('Modem não disponível no momento');
              }
              setCpeInfo(null);
              setDeviceCount(null);
            }
          } else {
            // Serviço não encontrado - não mostra erro técnico
            setCpeError(null);
            setCpeInfo(null);
            setDeviceCount(null);
          }
        } catch (cpeError: any) {
          console.error('Erro ao buscar dados do CPE:', cpeError);
          const errorMsg = cpeError?.response?.data?.msg || cpeError?.message || '';
          // Ignora mensagens técnicas sobre parâmetros obrigatórios
          if (errorMsg.includes('wifi_status') || errorMsg.includes('nova_senha') || errorMsg.includes('novo_ssid')) {
            setCpeError(null);
          } else {
            // Mostra mensagem amigável apenas se não for erro técnico
            setCpeError('Não foi possível carregar informações do modem');
          }
          setCpeInfo(null);
          setDeviceCount(null);
        }
      } else {
        // Contrato não disponível - não mostra erro
        setCpeError(null);
        setCpeInfo(null);
        setDeviceCount(null);
      }
    } catch (error) {
      console.error('Erro geral ao buscar dados:', error);
      setCpeError('Erro ao carregar informações');
    } finally {
      setRefreshing(false);
      setLoadingCpe(false);
    }
  }, [user, activeContract]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isFocused) {
      const interval = setInterval(async () => {
        const netInfo = await getNetworkInfo({ requestLocationPermission: false });
        setNetworkInfo(netInfo);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSaveWifi = async () => {
    if (!activeContract || !serviceId) {
      Alert.alert('Erro', 'Informações do contrato não disponíveis.');
      return;
    }
    
    // Validação: pelo menos um campo deve ser preenchido
    if (!wifiSsid && !wifiPassword && !wifiSsid5 && !wifiPassword5) {
      Alert.alert('Atenção', 'Preencha pelo menos um campo para alterar as configurações do Wi-Fi.');
      return;
    }
    
    setSaving(true);
    try {
      const result = await sgpService.alterarWifi(
        activeContract.id,
        serviceId,
        wifiSsid || cpeInfo?.wifi_ssid || cpeInfo?.ssid || '',
        wifiPassword || cpeInfo?.wifi_password || '',
        wifiSsid5 || cpeInfo?.wifi_ssid_5ghz || '',
        wifiPassword5 || cpeInfo?.wifi_password_5ghz || ''
      );

      if (result.success) {
        Alert.alert('Sucesso', 'Alterações realizadas com sucesso.', [
          { text: 'OK', onPress: () => fetchData() }
        ]);
      } else {
        // Mostra mensagem de erro amigável
        const errorMsg = result.msg || 'Falha ao alterar configurações.';
        // Traduz mensagens técnicas para algo mais amigável
        let friendlyMsg = errorMsg;
        if (errorMsg.includes('wifi_status') || errorMsg.includes('nova_senha') || errorMsg.includes('novo_ssid')) {
          friendlyMsg = 'Preencha pelo menos um campo (SSID ou senha) para alterar as configurações.';
        }
        Alert.alert('Erro', friendlyMsg);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.msg || error?.message || 'Ocorreu um erro ao salvar as alterações.';
      // Traduz mensagens técnicas
      let friendlyMsg = errorMsg;
      if (errorMsg.includes('wifi_status') || errorMsg.includes('nova_senha') || errorMsg.includes('novo_ssid')) {
        friendlyMsg = 'Preencha pelo menos um campo (SSID ou senha) para alterar as configurações.';
      }
      Alert.alert('Erro', friendlyMsg);
    } finally {
      setSaving(false);
    }
  };

  // Modelo do modem - busca do CPE primeiro, depois fallback
  const modemModel = cpeInfo?.product_class || 
                     cpeInfo?.model || 
                     cpeInfo?.model_name || 
                     (cpeInfo?.manufacturer && cpeInfo?.product_class ? `${cpeInfo.manufacturer} ${cpeInfo.product_class}` : null) ||
                     '---';
  
  // SSID Logic: Prefer CPE info (live), fallback to Contract info (configured)
  // Busca também nos wlan_interfaces se disponível
  const ssid24FromInterface = cpeInfo?.interface_info?.wlan_interfaces?.find((iface: any) => 
    iface.frequency === '2.4GHz' || iface.frequency_key === 'X_HW_RFBand'
  )?.ssid;
  
  const ssid5FromInterface = cpeInfo?.interface_info?.wlan_interfaces?.find((iface: any) => 
    iface.frequency === '5GHz' || iface.frequency === '5GHz'
  )?.ssid;
  
  const displaySsid24 = cpeInfo?.wifi_ssid || 
                        ssid24FromInterface ||
                        cpeInfo?.ssid || 
                        activeContract?.wifiSSID || 
                        '---';
  const displaySsid5 = cpeInfo?.wifi_ssid_5ghz || 
                        ssid5FromInterface ||
                        activeContract?.wifiSSID5 || 
                        '---';
  
  // IP Address - prioriza IP do CPE (WAN), depois IP local do dispositivo
  const ipAddress = cpeInfo?.wan_ip || 
                    cpeInfo?.ip || 
                    cpeInfo?.wan_ip_address || 
                    cpeInfo?.ip_address || 
                    cpeInfo?.public_ip ||
                    networkInfo?.ipAddress || 
                    '---';
  
  // Uptime - wan_up_time está em dias, não segundos
  const formatUptime = (days?: number): string => {
    if (!days || days <= 0) {
      // Tenta calcular a partir do lastboot_date se disponível
      if (cpeInfo?.lastboot_date) {
        try {
          const bootDate = new Date(cpeInfo.lastboot_date);
          const now = new Date();
          const diffMs = now.getTime() - bootDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            return `Conectado há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
          }
        } catch (e) {
          console.error('Erro ao calcular uptime:', e);
        }
      }
      return '---';
    }
    
    return `Conectado há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  };
  
  const uptime = formatUptime(cpeInfo?.wan_up_time);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <MaterialCommunityIcons 
          name="arrow-left" 
          size={28} 
          color={colors.white} 
          onPress={() => navigation.goBack()} 
        />
        <Text style={styles.title}>Meu Modem</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.card}>
            {/* Modem Header */}
            <View style={styles.modemHeader}>
              <View style={[styles.modemIconContainer, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="router-wireless" size={32} color={colors.white} />
              </View>
              <Text style={styles.modemTitle}>Modem</Text>
              {loadingCpe ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.modemModel}>
                  {modemModel !== '---' ? modemModel : cpeError ? cpeError : cpeInfo ? 'Carregando...' : 'Sem dados do modem'}
                </Text>
              )}
              {/* Não mostra mensagens de erro técnicas para o usuário ao visualizar */}
              {/* Erros só aparecem quando o usuário tenta alterar algo */}
            </View>

            <View style={styles.divider} />

            {/* Wi-Fi Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="wifi" size={20} color={colors.white} />
                </View>
                <Text style={styles.sectionTitle}>Wi-Fi</Text>
              </View>
              
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>
                  • {displaySsid24} (2.4 GHz)
                </Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>
                  • {displaySsid5} (5 GHz)
                </Text>
              </View>
              {networkInfo?.strength !== null && networkInfo?.strength !== undefined && (
                <View style={styles.itemRow}>
                  <Text style={styles.itemLabel}>
                    • Sinal do Dispositivo: {networkInfo.strength} dBm
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* Internet Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="web" size={20} color={colors.white} />
                </View>
                <Text style={styles.sectionTitle}>Internet</Text>
              </View>

              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>• IP: {ipAddress !== '---' ? ipAddress : 'Carregando...'}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>• {uptime !== '---' ? uptime : 'Carregando...'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Devices Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="cellphone" size={20} color={colors.white} />
                </View>
                <Text style={styles.sectionTitle}>Dispositivos</Text>
              </View>
              <View style={styles.itemRow}>
                 <Text style={styles.itemLabel}>
                   • Dispositivos conectados
                 </Text>
                 <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {deviceCount !== null && deviceCount !== undefined ? deviceCount : loadingCpe ? '...' : '---'}
                    </Text>
                 </View>
              </View>
            </View>
          </View>

          {/* Wi-Fi Configuration Card */}
          <View style={[styles.card, styles.configCard]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="wifi-cog" size={20} color={colors.white} />
              </View>
              <Text style={styles.sectionTitle}>Configurar Wi-Fi</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rede Wi-Fi (2.4 GHz)</Text>
              <TextInput
                style={styles.input}
                value={wifiSsid}
                onChangeText={setWifiSsid}
                placeholder="Nome da rede"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={wifiPassword}
                  onChangeText={setWifiPassword}
                  placeholder="Senha (Letra maiúscula, número, caractere especial)"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword24}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword24(!showPassword24)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons 
                    name={showPassword24 ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rede Wi-Fi (5 GHz)</Text>
              <TextInput
                style={styles.input}
                value={wifiSsid5}
                onChangeText={setWifiSsid5}
                placeholder="Nome da rede"
                placeholderTextColor={colors.textSecondary}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={wifiPassword5}
                  onChangeText={setWifiPassword5}
                  placeholder="Senha (Letra maiúscula, número, caractere especial)"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword5}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword5(!showPassword5)}
                  style={styles.eyeIcon}
                >
                  <MaterialCommunityIcons 
                    name={showPassword5 ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveWifi}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={'#FFFFFF'} />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Alterações</Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  configCard: {
    marginTop: 8,
  },
  modemHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modemIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  modemModel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    width: '100%',
    marginVertical: 16,
  },
  section: {
    paddingHorizontal: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  itemRow: {
    marginBottom: 8,
    paddingLeft: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary + '33',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: colors.text,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
