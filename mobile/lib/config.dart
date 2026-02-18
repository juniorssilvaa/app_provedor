
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
  static const String _envApiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static String get apiBaseUrl {
    if (_runtimeApiBaseUrl != null && _runtimeApiBaseUrl!.isNotEmpty) {
      return _runtimeApiBaseUrl!;
    }
    final base = _envApiBaseUrl.isNotEmpty ? _envApiBaseUrl : 'https://apis.niochat.com.br/api/';
    return base.endsWith('/') ? base : '$base/';
  }

  /// Diferença de tempo entre o celular e o servidor (em milisegundos)
  static int _serverOffsetMs = 0;

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
