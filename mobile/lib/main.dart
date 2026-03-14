import 'dart:async';
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/app_config.dart';
import 'core/app_theme.dart';
import 'core/app_routes.dart';
import 'providers/app_provider.dart';
import 'services/push_service.dart';
import 'screens/home/home_screen.dart';
import 'screens/login/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR', null);

  // Configurações Globais
  try {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool('api_base_url_use_override') ?? false;
    final override = prefs.getString('api_base_url_override') ?? '';
    if (enabled && override.isNotEmpty) {
      AppConfig.setRuntimeApiBaseUrl(override);
    }
  } catch (e) {
    debugPrint("Erro ao carregar SharedPreferences: $e");
  }

  // Inicialização do Firebase
  try {
    await Firebase.initializeApp().timeout(const Duration(seconds: 8));
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  } catch (e) {
    debugPrint("⚠️ Erro Firebase: $e");
  }

  final AppProvider provider = AppProvider();
  await provider.initialize();
  
  try {
    await provider.initPushService();
  } catch (_) {}

  try {
    await AppConfig.syncTime();
  } catch (_) {}

  runApp(
    ChangeNotifierProvider.value(
      value: provider,
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  Timer? _inactivityTimer;
  DateTime? _pausedTime;
  static const int _timeoutMinutes = 5;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetInactivityTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _inactivityTimer?.cancel();
    super.dispose();
  }

  void _resetInactivityTimer() {
    _inactivityTimer?.cancel();
    _inactivityTimer = Timer(const Duration(minutes: _timeoutMinutes), _handleInactivityTimeout);
  }

  void _handleInactivityTimeout() {
    final provider = Provider.of<AppProvider>(context, listen: false);
    if (provider.isLoggedIn) {
      debugPrint('Timeout de inatividade alcançado. Deslogando usuário...');
      provider.logout();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      // App foi minimizado
      _pausedTime = DateTime.now();
      _inactivityTimer?.cancel();
    } else if (state == AppLifecycleState.resumed) {
      // App voltou para primeiro plano
      if (_pausedTime != null) {
        final backgroundDuration = DateTime.now().difference(_pausedTime!);
        if (backgroundDuration.inMinutes >= _timeoutMinutes) {
          debugPrint('App ficou em background por \${backgroundDuration.inMinutes} minutos. Deslogando...');
          _handleInactivityTimeout();
        } else {
          _resetInactivityTimer();
        }
      } else {
        _resetInactivityTimer();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _resetInactivityTimer(),
      onPointerMove: (_) => _resetInactivityTimer(),
      onPointerUp: (_) => _resetInactivityTimer(),
      child: Consumer<AppProvider>(
        builder: (context, provider, child) {
          return MaterialApp(
            title: 'WR TELECOM',
            debugShowCheckedModeBanner: false,
            themeMode: provider.themeMode,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            supportedLocales: const [
              Locale('pt', 'BR'),
            ],
            locale: const Locale('pt', 'BR'),
            home: provider.isLoggedIn ? HomeScreen() : const LoginScreen(),
            routes: AppRoutes.routes,
          );
        },
      ),
    );
  }
}
