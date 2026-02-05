import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:network_info_plus/network_info_plus.dart';

class TelemetryService {
  final _networkInfo = NetworkInfo();
  final _connectivity = Connectivity();

  Future<Map<String, dynamic>> collectTelemetry() async {
    String? ssid;
    String? ip;
    String? bssid;
    
    try {
      ssid = await _networkInfo.getWifiName();
      ip = await _networkInfo.getWifiIP();
      bssid = await _networkInfo.getWifiBSSID();
    } catch (e) {
      print('Erro ao coletar telemetria WiFi: $e');
    }

    final connectivityResult = await _connectivity.checkConnectivity();
    
    return {
      'ssid': ssid ?? 'Desconhecido',
      'ip': ip ?? '0.0.0.0',
      'bssid': bssid,
      'connectivity': connectivityResult.toString(),
      'timestamp': DateTime.now().toIso8601String(),
      // Signal strength requires platform-specific channels or additional plugins
      // for now we'll focus on what's available in network_info_plus
      'signal_strength': 100, // Placeholder
    };
  }
}
