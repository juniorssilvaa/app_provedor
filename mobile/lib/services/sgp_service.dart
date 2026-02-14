import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:nanet_app/config.dart';

class SGPService {
  final String apiBaseUrl;
  final String providerToken;

  SGPService({required this.apiBaseUrl, required this.providerToken});

  Future<dynamic> _proxyGet(String endpoint, Map<String, String> params) async {
    final token = providerToken;
    
    // Adiciona o token do provedor aos parâmetros
    final fullParams = Map<String, String>.from(params);
    fullParams['provider_token'] = token;

    // Constrói a query string
    final queryString = Uri(queryParameters: fullParams).query;
    final url = Uri.parse('${apiBaseUrl}sgp/$endpoint?$queryString');

    try {
      debugPrint('SGPService: GET $url');
      final response = await http.get(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'X-Provider-Token': token,
        },
      );
      return _handleResponse(response);
    } catch (e) {
      debugPrint('Erro na requisição GET: $e');
      return null;
    }
  }

  Future<dynamic> _proxyPost(String endpoint, Map<String, dynamic> data) async {
    final token = providerToken;
    
    // Adiciona token na query string também para garantir passagem em proxies agressivos
    final url = Uri.parse('${apiBaseUrl}sgp/$endpoint?provider_token=$token');
    
    // Injeta o token na requisição para identificar o provedor no backend
    final payload = Map<String, dynamic>.from(data);
    payload['provider_token'] = token;

    try {
      debugPrint('SGPService: POST $url');
      debugPrint('Payload: $payload');
      
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'X-Provider-Token': token,
        },
        body: jsonEncode(payload),
      );

      return _handleResponse(response);
    } catch (e) {
      debugPrint('Erro na requisição: $e');
      return null;
    }
  }

  // --- INTERNAL API METHODS (Direct Backend Access) ---
  Future<dynamic> _apiGet(String endpoint, Map<String, String> params) async {
    final token = providerToken;
    final fullParams = Map<String, String>.from(params);
    fullParams['provider_token'] = token;

    final queryString = Uri(queryParameters: fullParams).query;
    final url = Uri.parse('${apiBaseUrl}$endpoint?$queryString');

    try {
      debugPrint('SGPService: API GET $url');
      final response = await http.get(url, headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
        'X-Provider-Token': token,
      });
      return _handleResponse(response);
    } catch (e) {
      debugPrint('Erro na requisição API GET: $e');
      return null;
    }
  }

  Future<dynamic> _apiPost(String endpoint, Map<String, dynamic> data) async {
    final token = providerToken;
    final payload = Map<String, dynamic>.from(data);
    payload['provider_token'] = token;

    final url = Uri.parse('${apiBaseUrl}$endpoint');

    try {
      debugPrint('SGPService: API POST $url');
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
          'X-Provider-Token': token,
        },
        body: jsonEncode(payload),
      );
      return _handleResponse(response);
    } catch (e) {
      debugPrint('Erro na requisição API POST: $e');
      return null;
    }
  }

  dynamic _handleResponse(http.Response response) {
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      debugPrint('Backend error: ${response.statusCode} - ${response.body}');
      throw Exception('Failed to load data: ${response.statusCode}');
    }
  }

  // Specific SGP Methods
  Future<Map<String, dynamic>?> getClientByCpf(String cpfCnpj) async {
    try {
      final data = await _proxyPost('cliente/consulta/', {'cpf_cnpj': cpfCnpj});
      return data;
    } catch (e) {
      debugPrint('Erro ao buscar cliente: $e');
      return null;
    }
  }

  Future<List<dynamic>> getInvoices(String cpfCnpj) async {
    try {
      final data = await _proxyPost('ura/titulos/', {'cpf_cnpj': cpfCnpj});
      
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        if (data.containsKey('titulos')) return data['titulos'];
        if (data.containsKey('faturas')) return data['faturas'];
      }
      return [];
    } catch (e) {
      debugPrint('Erro ao buscar faturas: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>?> getContractInfo(String contractId) async {
    return await _proxyPost('contrato/$contractId/', {});
  }

  Future<Map<String, dynamic>?> getCpeInfo(String contractId) async {
    return await _proxyPost('cpe/$contractId/', {});
  }

  Future<List<dynamic>> getContratos(String cpfCnpj, String password) async {
    try {
      final data = await _proxyPost('central/contratos/', {
        'cpf_cnpj': cpfCnpj,
        'senha': password,
      });
      
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        if (data.containsKey('contratos')) return data['contratos'];
        if (data.containsKey('registros')) return data['registros'];
      }
      return [];
    } catch (e) {
      debugPrint('Erro ao buscar contratos: $e');
      return [];
    }
  }

  // Support Tickets
  Future<List<dynamic>> getSupportTickets(String cpfCnpj, String password, String contractId) async {
    try {
      final data = await _proxyPost('central/chamado/list/', {
        'cpfcnpj': cpfCnpj,
        'oc_status': '0',
      });
      
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        if (data.containsKey('chamados')) return data['chamados'];
        if (data.containsKey('list')) return data['list'];
        if (data.containsKey('registros')) return data['registros'];
      }
      return [];
    } catch (e) {
      debugPrint('Erro ao buscar chamados: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> openSupportTicket(String cpfCnpj, String password, String contractId, String typeId, String message) async {
    try {
      final data = await _proxyPost('ura/chamado/', {
        'contrato': contractId,
        'ocorrenciatipo': typeId, // 1: Sem acesso, 2: Internet lenta
        'conteudo': message,
        'conteudolimpo': message, // Envia a mesma mensagem como conteudo limpo
      });
      return data is Map<String, dynamic> ? data : {'status': 'success', 'data': data};
    } catch (e) {
      debugPrint('Erro ao abrir chamado: $e');
      return {'error': e.toString()};
    }
  }

  Future<bool> changeWifi(String contractId, {String? ssid, String? password, String? ssid5g, String? password5g}) async {
    debugPrint('DEBUG: changeWifi called for contract $contractId');
    try {
      final payload = {
        'contrato': contractId,
      };
      
      if (ssid != null && ssid.isNotEmpty) payload['novo_ssid'] = ssid;
      if (password != null && password.isNotEmpty) payload['nova_senha'] = password;
      if (ssid5g != null && ssid5g.isNotEmpty) payload['novo_ssid_5ghz'] = ssid5g;
      if (password5g != null && password5g.isNotEmpty) payload['nova_senha_5ghz'] = password5g;

      await _apiPost('wifi/config/', payload);
      return true;
    } catch (e) {
      debugPrint('Erro ao alterar wifi: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> getModemInfo(String contractId) async {
    try {
      debugPrint('SGPService: Fetching modem info for contract: $contractId');
      final data = await _apiGet('wifi/config/', {'contrato': contractId});
      debugPrint('SGPService: Modem info response: $data');
      return data;
    } catch (e) {
      debugPrint('Erro ao buscar info do modem: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>> openTicket(String contractId, String title, String description) async {
    try {
      final result = await _proxyPost('chamado/novo/', {
        'contract_id': contractId,
        'assunto': title,
        'mensagem': description,
      });
      return result ?? {};
    } catch (e) {
      debugPrint('Erro ao abrir chamado: $e');
      return {};
    }
  }

  Future<Map<String, dynamic>> unlockContract(String contractId, {String message = 'Solicitação de Desbloqueio via App'}) async {
    try {
      final result = await _proxyPost('ura/liberacaopromessa/', {
        'contrato': contractId,
        'conteudo': message,
      });
      return result is Map<String, dynamic> ? result : {};
    } catch (e) {
      debugPrint('Erro ao desbloquear contrato: $e');
      return {'status': 0, 'msg': 'Erro de conexão: $e'};
    }
  }

  Future<List<dynamic>> getConsumption(String cpfCnpj, String password, String contractId, int month, int year) async {
    debugPrint('DEBUG: getConsumption - CPF: $cpfCnpj, Pass: ${password.isEmpty ? "EMPTY" : "MASKED"}, Contract: $contractId, Date: $month/$year');
    try {
      final data = await _proxyPost('central/extratouso/', {
        'cpfcnpj': cpfCnpj,
        'senha': password,
        'contrato': contractId,
        'mes': month,
        'ano': year,
      });

      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        if (data.containsKey('list')) return data['list'];
        if (data.containsKey('extrato')) return data['extrato'];
        if (data.containsKey('dados')) return data['dados'];
      }
      return [];
    } catch (e) {
      debugPrint('Erro ao buscar consumo: $e');
      return [];
    }
  }

  Future<Map<String, dynamic>> getConsultaCliente(String cpfCnpj) async {
    try {
      final data = await _proxyPost('ura/consultacliente/', {
        'app': 'asnetchat', // Fixo conforme exemplo, mas poderia vir de config
        'cpfcnpj': cpfCnpj,
        'assinatura_eletronica': 1,
      });
      return data is Map<String, dynamic> ? data : {};
    } catch (e) {
      debugPrint('Erro ao consultar cliente (ura/consultacliente): $e');
      return {};
    }
  }
}