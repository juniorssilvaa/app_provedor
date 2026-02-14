
/// Configurações do aplicativo
class AppConfig {
  // ID do Provedor
  static const int providerId = 1;
  
  // Nome do Provedor
  static const String providerName = 'NANET TELECOM';
  
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
  // Produção (Encontrada no docker-compose.yml: apis.niochat.com.br)
  static const String apiBaseUrl = 'https://apis.niochat.com.br/api/';
}
