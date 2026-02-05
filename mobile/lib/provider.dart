import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'services/sgp_service.dart';
import 'services/ai_service.dart';
import 'services/telemetry_service.dart';

class AppProvider with ChangeNotifier {
  // Config
  static const String apiBaseUrl = 'http://127.0.0.1:8000/api/'; // Update for prod

  // Estado de Autenticação
  bool _isLoggedIn = false;
  String? _cpf;
  String? _token;
  String? _providerToken;
  String? _userName;
  Map<String, dynamic> _userContract = {};
  Map<String, dynamic> _userInfo = {};

  // Services
  SGPService? _sgpService;
  AIService? _aiService;
  final TelemetryService _telemetryService = TelemetryService();

  // Getters
  bool get isLoggedIn => _isLoggedIn;
  String? get cpf => _cpf;
  String? get token => _token;
  String? get providerToken => _providerToken;
  String? get userName => _userName;
  Map<String, dynamic> get userContract => _userContract;
  Map<String, dynamic> get userInfo => _userInfo;
  SGPService? get sgpService => _sgpService;
  AIService? get aiService => _aiService;
  TelemetryService get telemetryService => _telemetryService;

  AppProvider() {
    _loadSettings();
  }

  // Carregar configurações salvas
  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
    _cpf = prefs.getString('cpf');
    _token = prefs.getString('token');
    _providerToken = prefs.getString('providerToken');
    _userName = prefs.getString('userName');
    
    if (_providerToken != null) {
      _initServices(_providerToken!);
    }

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
  }

  void _initServices(String provToken) {
    _sgpService = SGPService(apiBaseUrl: apiBaseUrl, providerToken: provToken);
    _aiService = AIService(apiBaseUrl: apiBaseUrl, providerToken: provToken);
  }

  // Login
  Future<void> login({
    required String cpf,
    required String token,
    required String providerToken,
    String? userName,
    Map<String, dynamic>? contract,
    Map<String, dynamic>? info,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('cpf', cpf);
    await prefs.setString('token', token);
    await prefs.setString('providerToken', providerToken);
    if (userName != null) {
      await prefs.setString('userName', userName);
    }
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
    _userContract = contract ?? {};
    _userInfo = info ?? {};
    
    _initServices(providerToken);
    
    notifyListeners();
  }

  // Logout
  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    
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
}
