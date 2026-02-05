import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services.dart';

class SGPService {
  final String apiBaseUrl;
  final String providerToken;

  SGPService({required this.apiBaseUrl, required this.providerToken});

  // Helper for proxy requests to /sgp/
  Future<dynamic> _proxyGet(String endpoint) async {
    final response = await http.get(
      Uri.parse('${apiBaseUrl}sgp/$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $providerToken',
      },
    );
    return _handleResponse(response);
  }

  Future<dynamic> _proxyPost(String endpoint, Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('${apiBaseUrl}sgp/$endpoint'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $providerToken',
      },
      body: jsonEncode(data),
    );
    return _handleResponse(response);
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load data: ${response.statusCode}');
    }
  }

  // Specific SGP Methods
  Future<List<dynamic>> getInvoices(String cpfCnpj) async {
    final data = await _proxyGet('faturas/?cpf_cnpj=$cpfCnpj');
    return data['faturas'] ?? [];
  }

  Future<Map<String, dynamic>?> getContractInfo(String contractId) async {
    return await _proxyGet('contrato/$contractId/');
  }

  Future<Map<String, dynamic>?> getCpeInfo(String contractId) async {
    return await _proxyGet('cpe/$contractId/');
  }

  Future<bool> changeWifi(String contractId, String ssid, String password) async {
    try {
      await _proxyPost('wifi/config/', {
        'contract_id': contractId,
        'ssid': ssid,
        'password': password,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<Map<String, dynamic>> openTicket(String contractId, String title, String description) async {
    return await _proxyPost('chamado/novo/', {
      'contract_id': contractId,
      'assunto': title,
      'mensagem': description,
    });
  }
}
