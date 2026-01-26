import NetInfo, { NetInfoStateType, NetInfoWifiState } from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface NetworkInfo {
  ssid: string | null;
  ipAddress: string | null;
  connected: boolean;
  type: string;
  isInternetReachable: boolean;
  strength: number | null;
  frequency: number | null;
  linkSpeed: number | null;
  rxLinkSpeed: number | null;
  txLinkSpeed: number | null;
  latency: number | null;
  jitter: number | null;
  packetLoss: number | null;
}

// Configura o NetInfo para sempre buscar informações do WiFi
// IMPORTANTE: No Android, requer permissão de localização para obter SSID
NetInfo.configure({ 
  shouldFetchWiFiSSID: true,
  // Força busca de informações detalhadas do WiFi
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 60 * 1000, // 60 seconds
  reachabilityShortTimeout: 5 * 1000, // 5 seconds
  reachabilityRequestTimeout: 15 * 1000, // 15 seconds
});

const measureLatency = async (): Promise<{ latency: number | null; jitter: number | null; loss: number }> => {
  const samples: number[] = [];
  let lost = 0;
  const target = 'https://www.google.com/favicon.ico';
  
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    try {
      const response = await fetch(target, { method: 'HEAD', cache: 'no-cache' });
      if (response.ok) {
        samples.push(Date.now() - start);
      } else {
        lost++;
      }
    } catch (e) {
      lost++;
    }
  }

  if (samples.length === 0) return { latency: 0, jitter: 0, loss: 100 };

  const avgLatency = samples.reduce((a, b) => a + b, 0) / samples.length;
  
  // Basic Jitter calculation (average difference between consecutive samples)
  let totalDiff = 0;
  for (let i = 1; i < samples.length; i++) {
    totalDiff += Math.abs(samples[i] - samples[i - 1]);
  }
  const jitter = samples.length > 1 ? totalDiff / (samples.length - 1) : 0;
  const loss = (lost / 5) * 100;

  return { latency: Math.round(avgLatency), jitter: Math.round(jitter), loss };
};

let didRequestForegroundLocationPermission = false;

export const ensureLocationPermission = async (forceRequest: boolean = false): Promise<'granted' | 'denied' | 'undetermined'> => {
  if (Platform.OS !== 'android') return 'granted';

  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return 'granted';

  // Se já foi solicitado e não foi forçado, retorna o status atual
  if (didRequestForegroundLocationPermission && !forceRequest) {
    return (current.status as 'denied' | 'undetermined') ?? 'undetermined';
  }

  // Força nova solicitação se necessário
  if (forceRequest) {
    didRequestForegroundLocationPermission = false;
  }

  if (!didRequestForegroundLocationPermission) {
    didRequestForegroundLocationPermission = true;
    const requested = await Location.requestForegroundPermissionsAsync();
    return requested.status;
  }

  return (current.status as 'denied' | 'undetermined') ?? 'undetermined';
};

export const getNetworkInfo = async (
  options?: { requestLocationPermission?: boolean; skipLatency?: boolean }
): Promise<NetworkInfo> => {
  try {
    // Sempre solicita permissão de localização no Android para obter informações do WiFi
    // No Android, é obrigatório ter permissão de localização para ler SSID do WiFi
    if (Platform.OS === 'android') {
      await ensureLocationPermission();
    } else if (options?.requestLocationPermission) {
      await ensureLocationPermission();
    }

    const state = await NetInfo.fetch();
    let ssid: string | null = null;
    let ipAddress: string | null = null;
    let strength: number | null = null;
    let frequency: number | null = null;
    let linkSpeed: number | null = null;
    let rxLinkSpeed: number | null = null;
    let txLinkSpeed: number | null = null;

    if (state.type === NetInfoStateType.wifi && state.details) {
      const wifiState = state as NetInfoWifiState;
      ssid = wifiState.details.ssid ?? null;
      ipAddress = wifiState.details.ipAddress ?? null;
      strength = wifiState.details.strength ?? null;
      frequency = wifiState.details.frequency ?? null;
      linkSpeed = wifiState.details.linkSpeed ?? null;
      rxLinkSpeed = wifiState.details.rxLinkSpeed ?? null;
      txLinkSpeed = wifiState.details.txLinkSpeed ?? null;
    }

    if (ssid === 'Wi-Fi' || ssid === '<unknown ssid>') ssid = null;

    // Apenas mede latência se não for explicitamente pulado
    const quality = options?.skipLatency 
      ? { latency: null, jitter: null, loss: null }
      : await measureLatency();

    return {
      ssid,
      ipAddress,
      connected: state.isConnected || false,
      type: state.type,
      isInternetReachable: state.isInternetReachable || false,
      strength,
      frequency,
      linkSpeed,
      rxLinkSpeed,
      txLinkSpeed,
      latency: quality.latency,
      jitter: quality.jitter,
      packetLoss: quality.loss,
    };
  } catch (error) {
    console.error('Error fetching network info:', error);
    return {
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
      latency: null,
      jitter: null,
      packetLoss: null,
    };
  }
};
