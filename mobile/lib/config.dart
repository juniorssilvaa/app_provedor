import 'dart:convert';
import 'package:http/http.dart' as http;

/// Configurações do aplicativo
class AppConfig {
  // ID do Provedor
  static const int providerId = 1;
  
  // Nome do Provedor
  static const String providerName = 'NANET TELECOM';
  
  // Override em tempo de execução (persistido em SharedPreferences)
  static String? _runtimeApiBaseUrl;
  static void setRuntimeApiBaseUrl(String? baseUrl) {
    if (baseUrl == null || baseUrl.isEmpty) {
      _runtimeApiBaseUrl = null;
    } else {
      _runtimeApiBaseUrl = baseUrl.endsWith('/') ? baseUrl : '$baseUrl/';
    }
  }
  
  // Token de Identificação do Provedor (Gerado pelo Backend)
  // Pode ser injetado via --dart-define=PROVIDER_API_TOKEN=...
  static const String _rawApiToken = String.fromEnvironment(
    'PROVIDER_API_TOKEN',
    defaultValue: '',
  );

  static String get apiToken => _rawApiToken.replaceAll('+', '');
  
  // Telefone de Suporte
  static const String supportPhone = '+558182337720';

  // URL da API
  // Para produção, a URL oficial da NIOCHAT é usada por padrão.
  // Pode ser sobrescrita via --dart-define=API_BASE_URL=...
  static const String _envApiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://apis.niochat.com.br/api/');
  static String get apiBaseUrl {
    if (_runtimeApiBaseUrl != null && _runtimeApiBaseUrl!.isNotEmpty) {
      return _runtimeApiBaseUrl!;
    }
    // Para produção, usamos a URL oficial da NIOCHAT
    final base = _envApiBaseUrl; // Agora _envApiBaseUrl já contém a URL de produção como default
    return base.endsWith('/') ? base : '$base/';
  }

  /// Diferença de tempo entre o celular e o servidor (em milisegundos)
  static int _serverOffsetMs = 0;

  /// Sincroniza a hora do app com o servidor
  static Future<void> syncTime() async {
    try {
      final response = await http.get(
        Uri.parse('${apiBaseUrl}public/server-time/'),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final serverTime = DateTime.parse(data['server_time']);
        setServerTime(serverTime);
        print('Relógio sincronizado com o servidor: $serverTime');
      }
    } catch (e) {
      print('Erro ao sincronizar hora: $e');
    }
  }
  /// Atualiza o desvio de tempo baseado na hora vinda do servidor
  static void setServerTime(DateTime serverTime) {
    _serverOffsetMs = serverTime.millisecondsSinceEpoch - DateTime.now().millisecondsSinceEpoch;
  }

  /// Retorna a data atual no fuso horário de Brasília sincronizada com o servidor
  static DateTime getToday() {
    // Se tivermos offset, usamos o horário local sincronizado
    // Caso contrário, usamos o fallback UTC-3
    if (_serverOffsetMs != 0) {
      return DateTime.now().add(Duration(milliseconds: _serverOffsetMs));
    }
    
    final nowUtc = DateTime.now().toUtc();
    return nowUtc.subtract(const Duration(hours: 3));
  }
}
