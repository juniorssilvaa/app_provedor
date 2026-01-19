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

NetInfo.configure({ shouldFetchWiFiSSID: true });

const measureLatency = async (): Promise<{ latency: number; jitter: number; loss: number }> => {
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

  if (samples.length === 0) return { latency: null, jitter: null, loss: 100 };

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

export const ensureLocationPermission = async (): Promise<'granted' | 'denied' | 'undetermined'> => {
  if (Platform.OS !== 'android') return 'granted';

  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return 'granted';

  if (didRequestForegroundLocationPermission) {
    return (current.status as 'denied' | 'undetermined') ?? 'undetermined';
  }

  didRequestForegroundLocationPermission = true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status;
};

export const getNetworkInfo = async (
  options?: { requestLocationPermission?: boolean }
): Promise<NetworkInfo> => {
  try {
    if (options?.requestLocationPermission) {
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

    const quality = await measureLatency();

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
