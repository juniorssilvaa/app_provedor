import 'dart:convert';
import 'package:http/http.dart' as http;

/// Configurações do aplicativo - Versão Sincronizada
class AppConfig {
  static const int providerId = 2;
  static const String providerName = 'JOCA NET';
  static String? _runtimeApiBaseUrl;
  
  static void setRuntimeApiBaseUrl(String? baseUrl) {
    if (baseUrl == null || baseUrl.isEmpty) {
      _runtimeApiBaseUrl = null;
    } else {
      _runtimeApiBaseUrl = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    }
  }
  
  static const String _rawApiToken = String.fromEnvironment(
    'PROVIDER_API_TOKEN',
    defaultValue: '',
  );

  static String get apiToken => _rawApiToken.replaceAll('+', '');
  static const String supportPhone = '+5594992178654';
  static const String _envApiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://apis.niochat.com.br/');

  static String get apiBaseUrl {
    String base = _runtimeApiBaseUrl ?? _envApiBaseUrl;
    base = base.trim();
    if (base.endsWith('/api/')) {
        base = base.substring(0, base.length - 5);
    } else if (base.endsWith('/api')) {
        base = base.substring(0, base.length - 4);
    }
    return base.endsWith('/') ? base : '$base/';
  }

  static Uri apiUrl(String endpoint) {
    final base = apiBaseUrl;
    String path = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    if (path.startsWith('api/')) path = path.substring(4);
    final finalUrl = '${base}api/$path';
    // Usando print básico para evitar dependência de foundation na normalização
    print('NETWORK: $finalUrl');
    return Uri.parse(finalUrl);
  }

  static int _serverOffsetMs = 0;

  static Future<void> syncTime() async {
    try {
      final response = await http.get(apiUrl('public/server-time/')).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _serverOffsetMs = DateTime.parse(data['server_time']).millisecondsSinceEpoch - DateTime.now().millisecondsSinceEpoch;
      }
    } catch (_) {}
  }
  
  static void setServerTime(DateTime serverTime) {
    _serverOffsetMs = serverTime.millisecondsSinceEpoch - DateTime.now().millisecondsSinceEpoch;
  }

  static DateTime getToday() {
    if (_serverOffsetMs != 0) return DateTime.now().add(Duration(milliseconds: _serverOffsetMs));
    return DateTime.now().toUtc().subtract(const Duration(hours: 3));
  }
}
