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
}

NetInfo.configure({ shouldFetchWiFiSSID: true });

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
    };
  }
};
