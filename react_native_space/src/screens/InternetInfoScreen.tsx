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
    try {
      const netInfo = await getNetworkInfo({ requestLocationPermission: true });
      setNetworkInfo(netInfo);

      if (activeContract) {
        const accessInfo = await sgpService.verificaAcesso(activeContract.id);
        
        if (accessInfo && accessInfo.serviceId) {
          setServiceId(accessInfo.serviceId);
          const data = await sgpService.consultarCpe(activeContract.id, accessInfo.serviceId);
          
          if (data && data.success) {
            setCpeInfo(data.info);
            
            // Pre-fill form with current values
            setWifiSsid(data.info.wifi_ssid || data.info.ssid || activeContract.wifiSSID || '');
            setWifiPassword(data.info.wifi_password || activeContract.wifiPassword || '');
            setWifiSsid5(data.info.wifi_ssid_5ghz || activeContract.wifiSSID5 || '');
            setWifiPassword5(data.info.wifi_password_5ghz || activeContract.wifiPassword5 || '');

            // Try to find device count in common fields
            const count = data.info.online_host_num || 
                          data.info.associated_device_num || 
                          data.info.hosts?.length || 
                          data.info.lan_devices?.length;
            
            if (count !== undefined) {
              setDeviceCount(Number(count));
            } else {
              setDeviceCount(1); // Default to 1
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
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
    
    setSaving(true);
    try {
      const result = await sgpService.alterarWifi(
        activeContract.id,
        serviceId,
        wifiSsid,
        wifiPassword,
        wifiSsid5,
        wifiPassword5
      );

      if (result.success) {
        Alert.alert('Sucesso', 'Alterações realizadas com sucesso.', [
          { text: 'OK', onPress: () => fetchData() }
        ]);
      } else {
        Alert.alert('Erro', result.msg || 'Falha ao alterar configurações.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const modemModel = cpeInfo?.product_class || 'Huawei HG8145V5-V2';
  
  // SSID Logic: Prefer CPE info (live), fallback to Contract info (configured)
  const displaySsid24 = cpeInfo?.wifi_ssid || cpeInfo?.ssid || activeContract?.wifiSSID || '---';
  const displaySsid5 = cpeInfo?.wifi_ssid_5ghz || activeContract?.wifiSSID5 || '---';
  
  const ipAddress = networkInfo?.ipAddress || '100.64.37.109';
  const uptime = 'Conectado há 6 dias'; // Placeholder for uptime as it's hard to calculate without API data

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
              <Text style={styles.modemModel}>{modemModel}</Text>
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
                <Text style={styles.itemLabel}>• IP: {ipAddress}</Text>
              </View>
              <View style={styles.itemRow}>
                <Text style={styles.itemLabel}>• {uptime}</Text>
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
                    <Text style={styles.badgeText}>{deviceCount !== null ? deviceCount : 1}</Text>
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
});
