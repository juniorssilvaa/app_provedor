
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
}
