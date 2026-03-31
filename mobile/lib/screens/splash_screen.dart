import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../provider.dart';
import 'home/home_screen.dart';
import 'login/login_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _navigateToNextScreen();
    });
  }

  Future<void> _initServices() async {
    try {
      await Firebase.initializeApp().timeout(const Duration(seconds: 5));
      debugPrint('Firebase inicializado com sucesso');
    } catch (e) {
      debugPrint('Erro na inicialização do Firebase (ignorado no emulador): $e');
    }
    
    await Future.delayed(const Duration(milliseconds: 100));
  }

  Future<void> _navigateToNextScreen() async {
    debugPrint('SPLASH: start');
    AppProvider? appState;
    try {
      appState = context.read<AppProvider>();
    } catch (e) {
      debugPrint('SPLASH: provider not found: $e');
    }

    try {
      final initFuture = _initServices();
      final providerInit = (appState?.initialize() ?? Future.value()).timeout(const Duration(seconds: 4));
      final minDelayFuture = Future.delayed(const Duration(milliseconds: 2500));
      await Future.wait([initFuture, providerInit, minDelayFuture]).timeout(const Duration(seconds: 6));
    } catch (e) {
      debugPrint('Erro/timeout na Splash: $e');
    }

    try {
      await appState?.initPushService();
    } catch (e) {
      debugPrint('SPLASH: push init error: $e');
    }

    if (!mounted) return;

    bool loggedIn = appState?.isLoggedIn ?? false;
    if (!loggedIn) {
      try {
        final prefs = await SharedPreferences.getInstance().timeout(const Duration(seconds: 2));
        loggedIn = prefs.getBool('isLoggedIn') ?? false;
      } catch (_) {}
    }

    if (!mounted) return;
    try {
      // Sempre navegar para /login ao iniciar o app do zero
      Navigator.of(context).pushReplacementNamed('/login');
    } catch (e) {
      debugPrint('SPLASH: named navigation failed: $e');
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => loggedIn ? HomeScreen() : const LoginScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    const Color scaffoldBg = Color(0xFF000000); // Fundo preto conforme referência

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo Centralizada
            Image.asset(
              'assets/logo.png',
              width: 250, // Um pouco maior para destaque
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return const Icon(
                  Icons.wifi_rounded,
                  size: 100,
                  color: Color(0xFFFF0000),
                );
              },
            ),
            const SizedBox(height: 48),
            // Loading discreto
            const SizedBox(
              width: 32,
              height: 32,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF0000)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
