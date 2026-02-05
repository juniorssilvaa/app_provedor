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
      create: (_) => AppProvider(),
      child: MaterialApp(
        title: 'Nanet',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          primaryColor: const Color(0xFFFF0000),
          scaffoldBackgroundColor: const Color(0xFF000000),
          useMaterial3: true,
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFFFF0000),
            secondary: Color(0xFF222222),
            background: Color(0xFF000000),
            surface: Color(0xFF111111),
            error: Color(0xFFCF6679),
            onPrimary: Colors.white,
            onSecondary: Colors.white,
            onBackground: Colors.white,
            onSurface: Colors.white,
            onError: Colors.black,
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
