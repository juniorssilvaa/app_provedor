import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'config.dart';
import 'services/sgp_service.dart';
import 'services/ai_service.dart';
import 'services/telemetry_service.dart';
import 'services/push_service.dart';

class AppProvider with ChangeNotifier {
  // Config
  // static const String apiBaseUrl = 'http://127.0.0.1:8000/api/'; // Moved to config.dart

  // Theme
  ThemeMode _themeMode = ThemeMode.dark;

  // Estado de Autenticação
  bool _isLoggedIn = false;
  String? _cpf;
  String? _token;
  String? _providerToken;
  String? _userName;
  String? _centralPassword;
  Map<String, dynamic> _userContract = {};
  Map<String, dynamic> _userInfo = {};

  // Services
  SGPService? _sgpService;
  AIService? _aiService;
  final TelemetryService _telemetryService = TelemetryService();
  final PushService _pushService = PushService();

  // Configuração do App (Atalhos e Ferramentas)
  List<String> _activeShortcuts = [];
  List<String> _activeTools = [];
  bool _appConfigLoaded = false;

  // Notificações
  List<Map<String, dynamic>> _notifications = [];
  List<String> _readNotificationIds = [];

  int get unreadNotificationsCount => _notifications.where((n) => n['read'] != true).length;
  List<Map<String, dynamic>> get notifications => _notifications;

  Future<void> fetchNotifications() async {
    if (!_isLoggedIn || _providerToken == null) return;
    
    try {
      String url = '${AppConfig.apiBaseUrl}public/warnings/?provider_token=$_providerToken';
      if (_cpf != null) {
        url += '&cpf=$_cpf';
      }
      
      // Include contract_id if available
      if (_userContract.isNotEmpty) {
        final contractId = _userContract['id'] ?? _userContract['contract_id'];
        if (contractId != null) {
          url += '&contract_id=$contractId';
        }
      }
      
      final response = await http.get(Uri.parse(url));
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        _notifications = data.map((item) {
          final idStr = item['id'].toString();
          final isRead = _readNotificationIds.contains(idStr);
          
          return {
            ...item as Map<String, dynamic>,
            'read': isRead,
          };
        }).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Erro ao buscar notificações: $e');
    }
  }

  void markNotificationAsRead(String id) {
    final index = _notifications.indexWhere((n) => n['id'].toString() == id);
    if (index != -1) {
      _notifications[index]['read'] = true;
      if (!_readNotificationIds.contains(id)) {
        _readNotificationIds.add(id);
        _saveReadNotifications();
      }
      notifyListeners();
    }
  }

  Future<void> dismissNotification(String id) async {
    // 1. Mark as read locally first (optimistic UI)
    markNotificationAsRead(id);
    
    // 2. Call API to delete/dismiss on backend
    if (_providerToken == null) return;

    try {
      final url = '${AppConfig.apiBaseUrl}public/warnings/dismiss/';
      final body = {
        'provider_token': _providerToken,
        'warning_id': int.tryParse(id) ?? id,
        'cpf': _cpf,
      };

      await http.post(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      
      // Remove from local list if deleted (optional, but requested "some do app")
      _notifications.removeWhere((n) => n['id'].toString() == id);
      notifyListeners();
      
    } catch (e) {
      debugPrint('Erro ao dispensar notificação: $e');
    }
  }
  
  Future<void> _saveReadNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('read_notifications', _readNotificationIds);
  }

  // Getters
  ThemeMode get themeMode => _themeMode;
  bool get isLoggedIn => _isLoggedIn;
  String? get cpf => _cpf;
  String? get token => _token;
  String? get providerToken => _providerToken;
  String? get userName => _userName;
  String? get centralPassword => _centralPassword;
  Map<String, dynamic> get userContract => _userContract;
  Map<String, dynamic> get userInfo => _userInfo;
  SGPService? get sgpService => _sgpService;
  AIService? get aiService => _aiService;
  TelemetryService get telemetryService => _telemetryService;
  PushService get pushService => _pushService;
  List<String> get activeShortcuts => _activeShortcuts;
  List<String> get activeTools => _activeTools;
  bool get appConfigLoaded => _appConfigLoaded;

  AppProvider() {
    // Initialization moved to initialize() method
  }

  // Inicializar Push Service
  bool _pushListening = false;

  Future<void> initPushService() async {
    await _pushService.initialize();
    
    if (!_pushListening) {
      _pushService.messageStream.listen((message) {
        // Evita duplicatas se o ID já existir
        if (!_notifications.any((n) => n['id'] == message['id'])) {
           _notifications.insert(0, message);
           notifyListeners();
        }
      });
      _pushListening = true;
    }
    
    // Se estiver logado, garante que o token esteja atualizado no backend
    if (_isLoggedIn && _cpf != null) {
      debugPrint('Provider: Sincronizando token Push após inicialização...');
      String? customerId = _userInfo['id']?.toString() ?? _userInfo['id_cliente']?.toString();
      if (customerId == null && _userContract.isNotEmpty) {
        customerId = _userContract['id']?.toString() ?? _userContract['contract_id']?.toString();
      }
      await _pushService.registerDevice(cpf: _cpf, contractId: customerId);
    }
  }

  // Carregar configurações salvas
  Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
      _cpf = prefs.getString('cpf');
      _token = prefs.getString('token');
      // Always use the token from AppConfig to ensure it's up to date
      _providerToken = AppConfig.apiToken; 
      _userName = prefs.getString('userName');
      _centralPassword = prefs.getString('centralPassword');
      
      // Initialize services with the config token
      _initServices(_providerToken!);

      // Carregar configurações do app (atalhos)
      final cachedShortcuts = prefs.getString('activeShortcuts');
      final cachedTools = prefs.getString('activeTools');
      
      _readNotificationIds = prefs.getStringList('read_notifications') ?? [];

      if (_isLoggedIn) {
        await fetchNotifications();
      }
      if (cachedShortcuts != null) {
        try {
          _activeShortcuts = List<String>.from(jsonDecode(cachedShortcuts));
          _appConfigLoaded = true;
        } catch (_) {}
      }
      if (cachedTools != null) {
        try {
          _activeTools = List<String>.from(jsonDecode(cachedTools));
          _appConfigLoaded = true;
        } catch (_) {}
      }
      await fetchAppConfig();
      fetchNotifications();

      if (prefs.containsKey('userContract')) {
        final contractJson = prefs.getString('userContract');
        if (contractJson != null) {
          try {
            _userContract = Map<String, dynamic>.from(jsonDecode(contractJson));
          } catch (e) {
            debugPrint('Erro ao carregar contrato: $e');
          }
        }
      }
      
      if (prefs.containsKey('userInfo')) {
        final infoJson = prefs.getString('userInfo');
        if (infoJson != null) {
          try {
            _userInfo = Map<String, dynamic>.from(jsonDecode(infoJson));
          } catch (e) {
            debugPrint('Erro ao carregar info do usuário: $e');
          }
        }
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Erro na inicialização do Provider: $e');
    }
  }

  void _initServices(String provToken) {
    _sgpService = SGPService(apiBaseUrl: AppConfig.apiBaseUrl, providerToken: provToken);
    _aiService = AIService(apiBaseUrl: AppConfig.apiBaseUrl, providerToken: provToken);
  }

  Future<void> fetchAppConfig() async {
    try {
      final tokenToUse = _providerToken ?? AppConfig.apiToken;
      final url = Uri.parse('${AppConfig.apiBaseUrl}public/config/?provider_token=$tokenToUse');
      final response = await http.get(url).timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        if (data['active_shortcuts'] != null) {
          _activeShortcuts = List<String>.from(data['active_shortcuts']);
        }
        
        if (data['active_tools'] != null) {
          if (data['active_tools'] is Map) {
            final toolsMap = data['active_tools'] as Map;
            _activeTools = toolsMap.entries
                .where((e) => e.value == true)
                .map((e) => e.key.toString())
                .toList();
          } else if (data['active_tools'] is List) {
            _activeTools = List<String>.from(data['active_tools']);
          }
        }

        _appConfigLoaded = true;

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('activeShortcuts', jsonEncode(_activeShortcuts));
        await prefs.setString('activeTools', jsonEncode(_activeTools));
        
        notifyListeners();
      } else {
        debugPrint('Erro ao buscar config do app: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Erro ao buscar config do app: $e');
    }
  }

  // Login
  Future<void> login({
    required String cpf,
    required String token,
    required String providerToken,
    String? userName,
    String? centralPassword,
    Map<String, dynamic>? contract,
    Map<String, dynamic>? info,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('cpf', cpf);
    await prefs.setString('token', token);
    await prefs.setString('providerToken', providerToken);
    if (userName != null) await prefs.setString('userName', userName);
    if (centralPassword != null) await prefs.setString('centralPassword', centralPassword);
    
    if (contract != null) {
      await prefs.setString('userContract', jsonEncode(contract));
    }
    if (info != null) {
      await prefs.setString('userInfo', jsonEncode(info));
    }

    _isLoggedIn = true;
    _cpf = cpf;
    _token = token;
    _providerToken = providerToken;
    _userName = userName;
    _centralPassword = centralPassword;
    _userContract = contract ?? {};
    _userInfo = info ?? {};
    
    _initServices(providerToken);

    await fetchAppConfig();
    await fetchNotifications();
    
    // Registrar usuário no backend para garantir nome correto na IA
    try {
      // Tenta extrair o ID do cliente (prioridade: info > contract)
      String? customerId = info?['id']?.toString() ?? info?['id_cliente']?.toString();
      if (customerId == null && contract != null) {
        customerId = contract['id']?.toString() ?? contract['contract_id']?.toString();
      }

      // Coletar informações do dispositivo
      String model = 'Unknown';
      String manufacturer = 'Unknown';
      String osVersion = 'Unknown';
      
      final deviceInfo = DeviceInfoPlugin();
      
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        model = androidInfo.model;
        manufacturer = androidInfo.manufacturer;
        osVersion = 'Android ${androidInfo.version.release} (SDK ${androidInfo.version.sdkInt})';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        model = iosInfo.utsname.machine;
        manufacturer = 'Apple';
        osVersion = 'iOS ${iosInfo.systemVersion}';
      }

      final url = Uri.parse('${AppConfig.apiBaseUrl}app/register/');
      http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'provider_token': providerToken,
          'cpf': cpf,
          'name': userName,
          'email': info?['email'],
          'customer_id': customerId,
          'device_platform': Platform.isAndroid ? 'android' : 'ios',
          'push_token': _pushService.token,
          'model': model,
          'manufacturer': manufacturer,
          'os_version': osVersion,
        }),
      ).then((_) => debugPrint('Usuário registrado no backend')).catchError((e) => debugPrint('Erro registro backend: $e'));
      
      // Registrar dispositivo para Push Notifications
      _pushService.registerDevice(cpf: cpf, contractId: customerId);
      
    } catch (e) {
      debugPrint('Erro ao tentar registrar usuário: $e');
    }

    notifyListeners();
  }

  // Logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('isLoggedIn');
    await prefs.remove('cpf');
    await prefs.remove('token');
    await prefs.remove('providerToken');
    await prefs.remove('userName');
    await prefs.remove('centralPassword');
    await prefs.remove('userContract');
    await prefs.remove('userInfo');
    await prefs.remove('activeShortcuts');
    await prefs.remove('activeTools');
    
    _isLoggedIn = false;
    _cpf = null;
    _token = null;
    _providerToken = null;
    _userName = null;
    _userContract = {};
    _userInfo = {};
    _sgpService = null;
    _aiService = null;
    
    notifyListeners();
  }

  // Atualizar informações do usuário
  Future<void> updateUserInfo(Map<String, dynamic> info) async {
    _userInfo = {..._userInfo, ...info};
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userInfo', jsonEncode(_userInfo));
    
    notifyListeners();
  }

  // Atualizar contrato
  Future<void> updateContract(Map<String, dynamic> contract) async {
    _userContract = contract;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userContract', jsonEncode(contract));

    notifyListeners();
  }

  Future<void> toggleTheme(bool isDark) async {
    _themeMode = isDark ? ThemeMode.dark : ThemeMode.light;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('themeMode', isDark ? 'dark' : 'light');
    notifyListeners();
  }

  // Atualizar dados completos (Recarregar do servidor)
  Future<void> refreshData() async {
    // Sempre recarrega a configuração do app ao atualizar
    await fetchAppConfig();
    fetchNotifications();

    if (_cpf == null || _sgpService == null) return;

    try {
      // 1. Buscar dados do cliente no SGP
      Map<String, dynamic>? clientData;
      Map<String, dynamic>? clientFullData = await _sgpService!.getClientByCpf(_cpf!);
      
      // Tentar obter lista completa de contratos via /central/contratos se tiver senha
      List contratos = [];
      if (_centralPassword != null && _centralPassword!.isNotEmpty) {
          try {
             debugPrint('REFRESH: Tentando buscar contratos via /central/contratos com senha...');
             contratos = await _sgpService!.getContratos(_cpf!, _centralPassword!);
             debugPrint('REFRESH: Sucesso! ${contratos.length} contratos encontrados via /central/contratos');
          } catch (e) {
             debugPrint('REFRESH: Erro ao buscar contratos via /central/contratos: $e');
          }
      }

      // Se não conseguiu via /central/contratos, usa o do getClientByCpf
      if (contratos.isEmpty && clientFullData != null && clientFullData.containsKey('contratos')) {
           contratos = clientFullData['contratos'];
           debugPrint('REFRESH: Usando lista de contratos do getClientByCpf (${contratos.length})');
      }

      if (contratos.isNotEmpty) {
           debugPrint('REFRESH: RAW Contratos: $contratos');
           // 1. Mapear TODOS os contratos
           final List<Map<String, dynamic>> allMappedContracts = [];
           
           for (var c in contratos) {
               // Tentar enriquecer com dados do clientFullData se os campos de endereço estiverem vazios
               bool hasNoAddress = (c['endereco_logradouro'] == null || c['endereco_logradouro'].toString().trim().isEmpty) && 
                                   (c['logradouro'] == null || c['logradouro'].toString().trim().isEmpty);

               if (clientFullData != null && hasNoAddress) {
                   // Tenta achar esse contrato no clientFullData['contratos']
                   var match;
                   final String cId = (c['contrato'] ?? c['id'] ?? c['contratoId'])?.toString() ?? '';
                   if (clientFullData['contratos'] is List && cId.isNotEmpty) {
                       try {
                           match = (clientFullData['contratos'] as List).firstWhere((element) => 
                               (element['contrato']?.toString() == cId) || 
                               (element['id']?.toString() == cId) ||
                               (element['contratoId']?.toString() == cId), orElse: () => null);
                       } catch (_) {}
                   }
                   
                   if (match != null) {
                        debugPrint('REFRESH: Match encontrado para contrato $cId no clientFullData');
                        // Mescla dados do match no contrato atual (priorizando o atual)
                        c = <String, dynamic>{...match, ...c};
                        
                        // Garante que o endereço foi atualizado no objeto c
                        c['logradouro'] = c['logradouro'] ?? match['logradouro'] ?? match['endereco_logradouro'];
                        c['numero'] = c['numero'] ?? match['numero'] ?? match['endereco_numero'];
                        c['bairro'] = c['bairro'] ?? match['bairro'] ?? match['endereco_bairro'];
                    } else {
                        debugPrint('REFRESH: Nenhum match específico para contrato $cId, usando endereço global');
                        // Se não achou match específico, usa o endereço principal do cliente como fallback
                        c['logradouro'] = c['logradouro'] ?? clientFullData['logradouro'] ?? clientFullData['endereco_logradouro'];
                        c['numero'] = c['numero'] ?? clientFullData['numero'] ?? clientFullData['endereco_numero'];
                        c['bairro'] = c['bairro'] ?? clientFullData['bairro'] ?? clientFullData['endereco_bairro'];
                    }
               }

               // Suporte a endereços aninhados (endereco_instalacao / endereco_cobranca)
                if (c['endereco_instalacao'] is Map) {
                   final ei = c['endereco_instalacao'] as Map;
                   if (c['logradouro'] == null || c['logradouro'].toString().isEmpty) c['logradouro'] = ei['logradouro'];
                   if (c['numero'] == null || c['numero'].toString().isEmpty) c['numero'] = ei['numero'];
                   if (c['bairro'] == null || c['bairro'].toString().isEmpty) c['bairro'] = ei['bairro'];
                } else if (c['endereco_cobranca'] is Map) {
                   final ec = c['endereco_cobranca'] as Map;
                   if (c['logradouro'] == null || c['logradouro'].toString().isEmpty) c['logradouro'] = ec['logradouro'];
                   if (c['numero'] == null || c['numero'].toString().isEmpty) c['numero'] = ec['numero'];
                   if (c['bairro'] == null || c['bairro'].toString().isEmpty) c['bairro'] = ec['bairro'];
                }

               // Construção robusta do endereço
               String logradouro = (c['endereco_logradouro'] ?? c['logradouro'] ?? c['rua'] ?? c['endereco'] ?? c['end'] ?? c['endereco_res'] ?? c['logradouro_res'] ?? c['rua_res'] ?? '').toString().trim();
               String numero = (c['endereco_numero'] ?? c['numero'] ?? c['n'] ?? c['numero_res'] ?? c['num'] ?? 'S/N').toString().trim();
               String bairro = (c['endereco_bairro'] ?? c['bairro'] ?? c['bairro_res'] ?? '').toString().trim();
               
               // Se logradouro ainda estiver vazio e tivermos clientFullData, tentar global novamente
               if (logradouro.isEmpty && clientFullData != null) {
                  logradouro = (clientFullData['endereco_logradouro'] ?? clientFullData['logradouro'] ?? '').toString().trim();
                  numero = (clientFullData['endereco_numero'] ?? clientFullData['numero'] ?? 'S/N').toString().trim();
                  bairro = (clientFullData['endereco_bairro'] ?? clientFullData['bairro'] ?? '').toString().trim();
               }

               String enderecoCompleto = '';
               
               if (logradouro.isNotEmpty) {
                 enderecoCompleto = logradouro;
                 if (numero.isNotEmpty && numero != '0') {
                   enderecoCompleto += ', $numero';
                 }
               }
               
               if (bairro.isNotEmpty) {
                 if (enderecoCompleto.isNotEmpty) {
                   enderecoCompleto += ' - $bairro';
                 } else {
                   enderecoCompleto = bairro;
                 }
               }
               
               // Fallback se tudo falhar
               if (enderecoCompleto.isEmpty || enderecoCompleto.trim() == ',') {
                 enderecoCompleto = 'Endereço não cadastrado';
               }
               
               debugPrint('REFRESH: Endereço processado para contrato ${c['contratoId'] ?? c['contrato']}: $enderecoCompleto (Raw: Log=$logradouro, Num=$numero, Bai=$bairro)');
               
               String dataCadastro = c['dataCadastro'] ?? c['data_cadastro'] ?? '24/10/2024';
               if (dataCadastro.contains(' ')) {
                 dataCadastro = dataCadastro.split(' ')[0];
               }

               allMappedContracts.add({
                 'id': c['contratoId']?.toString() ?? c['contrato']?.toString() ?? '1',
                 'status': c['contratoStatusDisplay'] ?? c['status'] ?? 'ATIVO',
                 'plan_name': c['planointernet'] ?? 'PLANO INTERNET',
                 'contract_due_day': c['cobVencimento']?.toString() ?? c['vencimento']?.toString() ?? '30',
                 'registration_date': dataCadastro,
                 'address': enderecoCompleto,
                 'expiry_date': '29/05/2025', 
                 'last_invoice_value': '0,00', 
                 'last_invoice_due': '--/--/----',
                 'last_invoice_status': 'pending'
               });
           }

           // Tentar obter dados do primeiro contrato para clientData (nome, senha)
           Map<String, dynamic> firstContractData = contratos.first;
           String razaoSocial = firstContractData['razaoSocial'] ?? firstContractData['razaosocial'] ?? 'Cliente';
           if (clientFullData != null && clientFullData.containsKey('contratos') && (clientFullData['contratos'] as List).isNotEmpty) {
              razaoSocial = clientFullData['contratos'][0]['razaoSocial'] ?? razaoSocial;
           }

           // Atualizar senha se vier na resposta
           String? newPassword;
           if (clientFullData != null) {
              newPassword = clientFullData['contratoCentralSenha'] ?? 
                            clientFullData['senha_central'] ?? 
                            clientFullData['senha'] ?? 
                            clientFullData['central_senha'] ?? 
                            clientFullData['password'];
              if (newPassword == null && clientFullData['contratos'] != null && (clientFullData['contratos'] as List).isNotEmpty) {
                  newPassword = clientFullData['contratos'][0]['contratoCentralSenha'] ?? clientFullData['contratos'][0]['senha'];
              }
           }
           
           if (newPassword != null) {
               _centralPassword = newPassword;
               final prefs = await SharedPreferences.getInstance();
               await prefs.setString('centralPassword', newPassword);
           }

           clientData = {
             'nome': razaoSocial,
             'contratos': allMappedContracts
           };

           // Preservar contrato selecionado atualmente
           Map<String, dynamic> selectedContract;
           
           // DEBUG: Ver chaves do contrato atual
           debugPrint('REFRESH: _userContract keys: ${_userContract.keys.toList()}');
           debugPrint('REFRESH: _userContract values: $_userContract');

           final currentId = (_userContract['id'] ?? _userContract['contrato'] ?? _userContract['contratoId'] ?? _userContract['contrato_id'])?.toString().trim();
           
           debugPrint('REFRESH: ID atual antes da busca: $currentId');
           debugPrint('REFRESH: IDs disponíveis: ${allMappedContracts.map((c) => c['id']).toList()}');

           try {
             if (currentId != null) {
                selectedContract = allMappedContracts.firstWhere(
                  (c) => c['id'].toString().trim() == currentId,
                  orElse: () => allMappedContracts.first
                );

                // Preservar endereço do estado anterior se o novo estiver vazio
                if ((selectedContract['address'] == 'Endereço não cadastrado' || selectedContract['address'] == '') && 
                    _userContract['id'].toString() == selectedContract['id'].toString() &&
                    _userContract['address'] != null && 
                    _userContract['address'] != 'Endereço não cadastrado') {
                    
                     selectedContract['address'] = _userContract['address'];
                     debugPrint('REFRESH: Endereço preservado do estado anterior: ${selectedContract['address']}');
                }
             } else {
                selectedContract = allMappedContracts.first;
             }
             debugPrint('REFRESH: Contrato mantido/selecionado: ${selectedContract['id']}');
           } catch (_) {
             debugPrint('REFRESH: Contrato não encontrado, revertendo para o primeiro.');
             selectedContract = allMappedContracts.first;
           }

             // Buscar dados reais da fatura para complementar
             try {
               final invoices = await _sgpService!.getInvoices(_cpf!);
               debugPrint('REFRESH: Faturas encontradas: ${invoices.length}');
               debugPrint('REFRESH: RAW Invoices: $invoices');
               
               if (invoices.isNotEmpty) {
                 final List<Map<String, dynamic>> sortedInvoices = [];
                 
                 for (var inv in invoices) {
                   if (inv is Map<String, dynamic>) {
                     final status = inv['status']?.toString().toLowerCase().trim();
                     // Aceita tudo que não for explicitamente pago/baixado/cancelado
                     if (status == 'pago' || status == 'baixado' || status == 'cancelado') continue;
                     
                     final invContratoId = (inv['clienteContrato'] ?? inv['contrato_id'] ?? inv['contrato'] ?? inv['id_contrato'] ?? inv['numero_contrato'] ?? inv['contrato_id_display'])?.toString();
                     debugPrint('REFRESH: Processando fatura ${inv['id'] ?? 'S/ID'} (Contrato: $invContratoId) - Status: $status');

                     String? rawDate = inv['dataVencimento'] ?? inv['data_vencimento'];
                     if (rawDate != null) {
                        try {
                          DateTime dt = DateTime.parse(rawDate);
                          inv['parsedDate'] = dt;
                          sortedInvoices.add(inv);
                        } catch (e) { }
                     }
                   }
                 }

                 sortedInvoices.sort((a, b) {
                   final dA = a['parsedDate'] as DateTime;
                   final dB = b['parsedDate'] as DateTime;
                   return dA.compareTo(dB);
                 });
                 
                 // Tentar encontrar fatura para o contrato selecionado
                 Map<String, dynamic>? priorityInvoice;
                 try {
                   final selId = selectedContract['id'].toString();
                   
                   // Log da primeira fatura para debug se necessário
                   if (sortedInvoices.isNotEmpty) {
                     debugPrint('REFRESH: Chaves da primeira fatura: ${sortedInvoices.first.keys.toList()}');
                     debugPrint('REFRESH: Valores da primeira fatura: ${sortedInvoices.first}');
                   }

                   priorityInvoice = sortedInvoices.firstWhere(
                     (inv) {
                       final invContrato = (inv['clienteContrato'] ?? inv['contrato_id'] ?? inv['contrato'] ?? inv['id_contrato'] ?? inv['numero_contrato'] ?? inv['contrato_id_display'])?.toString();
                       
                       debugPrint('REFRESH: Comparando fatura (Contrato: $invContrato) com selecionado ($selId)');

                       // Match exato
                       if (invContrato != null && invContrato.toString().trim() == selId.trim()) return true;
                       
                       return false;
                     },
                     orElse: () => <String, dynamic>{},
                   );
                   
                   if (priorityInvoice.isEmpty) priorityInvoice = null;
                   
                   debugPrint('REFRESH: Fatura prioritária encontrada para contrato $selId: ${priorityInvoice != null}');
                 } catch (_) {
                   // Se só tem um contrato e achou faturas, assume que são dele
                   if (allMappedContracts.length == 1 && sortedInvoices.isNotEmpty) {
                     priorityInvoice = sortedInvoices.first;
                     debugPrint('REFRESH: Usando primeira fatura disponível (contrato único)');
                   }
                 }
                 
                 if (priorityInvoice != null) {
                     if (priorityInvoice['valor'] != null) {
                       double val = double.tryParse(priorityInvoice['valor'].toString()) ?? 0.0;
                       selectedContract['last_invoice_value'] = val.toStringAsFixed(2).replaceAll('.', ',');
                     }
                     
                     String? rawDate = priorityInvoice['dataVencimento'] ?? priorityInvoice['data_vencimento'];
                     if (rawDate != null) {
                       try {
                          DateTime dueDate = DateTime.parse(rawDate);
                          String dayStr = dueDate.day.toString().padLeft(2, '0');
                          String monthStr = dueDate.month.toString().padLeft(2, '0');
                          String yearStr = dueDate.year.toString();
                          
                          selectedContract['last_invoice_due'] = '$dayStr/$monthStr/$yearStr';
                          selectedContract['expiry_date'] = selectedContract['last_invoice_due'];

                          final now = DateTime.now();
                          final today = DateTime(now.year, now.month, now.day);
                          final due = DateTime(dueDate.year, dueDate.month, dueDate.day);
                          
                          if (due.isBefore(today)) {
                            selectedContract['invoice_status_code'] = 'overdue';
                          } else {
                            selectedContract['invoice_status_code'] = 'open';
                          }
                       } catch (_) {
                         selectedContract['last_invoice_due'] = rawDate;
                         selectedContract['invoice_status_code'] = 'open';
                       }
                     }

                     if (priorityInvoice['codigoPix'] != null) {
                       selectedContract['pix_code'] = priorityInvoice['codigoPix'];
                     }
                     if (priorityInvoice['linhaDigitavel'] != null) {
                       selectedContract['barcode'] = priorityInvoice['linhaDigitavel'];
                     }
                 } else {
                    selectedContract['invoice_status_code'] = 'paid';
                    selectedContract['last_invoice_value'] = '0,00';
                    selectedContract['last_invoice_due'] = '--/--/----';
                 }
               } else {
                  // Sem faturas retornadas (vazio) -> Tudo pago
                  selectedContract['invoice_status_code'] = 'paid';
                  selectedContract['last_invoice_value'] = '0,00';
                  selectedContract['last_invoice_due'] = '--/--/----';
               }
             } catch (e) {
               debugPrint('Erro ao complementar dados da fatura no refresh: $e');
             }
             
             // Atualizar contrato do usuário com a seleção preservada
             _userContract = selectedContract;
      }
      
      if (clientData != null) {
         // Atualizar estado
         _userInfo = clientData;
         // _userContract já foi atualizado acima
         
         // Persistir
         final prefs = await SharedPreferences.getInstance();
         await prefs.setString('userInfo', jsonEncode(_userInfo));
         await prefs.setString('userContract', jsonEncode(_userContract));
         
         notifyListeners();
      }
    } catch (e) {
      debugPrint('Erro no refreshData: $e');
      throw e;
    }
  }

  Future<Map<String, dynamic>> unlockContract(String contractId) async {
    if (_sgpService == null) return {'status': 0, 'msg': 'Serviço não inicializado'};
    try {
      final result = await _sgpService!.unlockContract(contractId, message: 'Solicitação de Desbloqueio via App');
      // Se sucesso, atualizar dados para refletir novo status
      if (result['status'] == 1 || result['liberado'] == true) {
         // Pequeno delay para propagação
         await Future.delayed(const Duration(seconds: 1));
         await refreshData();
      }
      return result;
    } catch (e) {
      debugPrint('Erro ao desbloquear contrato: $e');
      return {'status': 0, 'msg': 'Erro: $e'};
    }
  }
}
