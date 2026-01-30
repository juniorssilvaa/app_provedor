import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:provider/provider.dart';

import 'services.dart';
import 'screens/splash_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/login/login_screen.dart';
import 'screens/fatura/fatura_screen.dart';
import 'screens/ai/ai_chat_screen.dart';
import 'screens/planos/planos_screen.dart';
import 'screens/perfil/perfil_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar Firebase
  await Firebase.initializeApp();
  
  // Configurar notificações
  await FirebaseMessaging.instance.requestPermission();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState(),
      child: MaterialApp(
        title: 'Nanet',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: Colors.blue,
            brightness: Brightness.dark,
          ),
        ),
        home: const SplashScreen(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const HomeScreen(),
          '/fatura': (context) => const FaturaScreen(),
          '/ai_chat': (context) => const AIChatScreen(),
          '/planos': (context) => const PlanosScreen(),
          '/perfil': (context) => const PerfilScreen(),
        },
      ),
    );
  }
}

class AppState extends ChangeNotifier {
  bool _isLoggedIn = false;
  String? _cpf;
  String? _token;
  String? _providerToken;
  Map<String, dynamic> _userContract = {};

  bool get isLoggedIn => _isLoggedIn;
  String? get cpf => _cpf;
  String? get token => _token;
  String? get providerToken => _providerToken;
  Map<String, dynamic> get userContract => _userContract;

  AppState() {
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _isLoggedIn = prefs.getBool('isLoggedIn') ?? false;
    _cpf = prefs.getString('cpf');
    _token = prefs.getString('token');
    _providerToken = prefs.getString('providerToken');
    
    if (prefs.containsKey('userContract')) {
      final contractJson = prefs.getString('userContract');
      if (contractJson != null) {
        try {
          _userContract = Map<String, dynamic>.from(jsonDecode(contractJson));
        } catch (e) {
          print('Erro ao carregar contrato: $e');
        }
      }
    }
    notifyListeners();
  }

  Future<void> login(String cpf, String token, String providerToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isLoggedIn', true);
    await prefs.setString('cpf', cpf);
    await prefs.setString('token', token);
    await prefs.setString('providerToken', providerToken);
    
    _isLoggedIn = true;
    _cpf = cpf;
    _token = token;
    _providerToken = providerToken;
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    
    _isLoggedIn = false;
    _cpf = null;
    _token = null;
    _providerToken = null;
    _userContract = {};
    notifyListeners();
  }

  Future<void> setContract(Map<String, dynamic> contract) async {
    _userContract = contract;
    
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userContract', jsonEncode(contract));
    
    notifyListeners();
  }
}
