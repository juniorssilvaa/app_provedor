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
    debugPrint('SPLASH: navigating loggedIn=$loggedIn');
    try {
      Navigator.of(context).pushReplacementNamed(loggedIn ? '/home' : '/login');
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
    const Color primaryRed = Color(0xFFFF0000);
    const Color scaffoldBg = Color(0xFF000000);

    return Scaffold(
      backgroundColor: scaffoldBg,
      body: Stack(
        children: [
          /*
          // Background subtle gradient removed as per user request
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.0,
                  colors: [
                    primaryRed.withOpacity(0.05),
                    scaffoldBg,
                  ],
                ),
              ),
            ),
          ),
          */
          
          Center(
            child: SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Section with animation-ready structure
                  TweenAnimationBuilder<double>(
                  key: const ValueKey('splash_logo_anim'),
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(seconds: 1),
                  curve: Curves.easeOut,
                  builder: (context, value, child) {
                    final double safeOpacity = value.clamp(0.0, 1.0);
                    return Transform.scale(
                      scale: value,
                      child: Opacity(
                        opacity: safeOpacity,
                        child: child,
                      ),
                    );
                  },
                  child: Image.asset(
                    'assets/logo_home.png',
                    width: 200,
                    height: 200,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(
                        Icons.network_check_rounded,
                        size: 140,
                        color: primaryRed,
                      );
                    },
                  ),
                ),
                const SizedBox(height: 80),
                
                // Loading Section
                const SizedBox(
                  width: 40,
                  height: 40,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(primaryRed),
                  ),
                ),
              ],
            ),
          ),
          ),
          
          // Version info at bottom
          /*const Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Center(
              child: Text(
                'versão 2.1.0',
                style: TextStyle(
                  color: Colors.white10,
                  fontSize: 10,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),*/
        ],
      ),
    );
  }
}
