import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../main.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNextScreen();
  }

  Future<void> _navigateToNextScreen() async {
    // Aguardar 2.5 segundos para mostrar o splash com calma
    await Future.delayed(const Duration(milliseconds: 2500));
    
    if (!mounted) return;

    final appState = context.read<AppState>();
    
    // Redirecionar para login ou home
    if (appState.isLoggedIn) {
      Navigator.of(context).pushReplacementNamed('/home');
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
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
          // Background subtle gradient for premium feel
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
          
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo Section with animation-ready structure
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(seconds: 1),
                  curve: Curves.easeOutBack,
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      child: Opacity(
                        opacity: value,
                        child: child,
                      ),
                    );
                  },
                  child: Column(
                    children: [
                      Image.asset(
                        'assets/images/logo.png',
                        width: 140,
                        height: 140,
                        errorBuilder: (context, error, stackTrace) {
                          return const Icon(
                            Icons.network_check_rounded,
                            size: 140,
                            color: primaryRed,
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'NANET',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.black,
                          color: Colors.white,
                          letterSpacing: -2,
                        ),
                      ),
                      Text(
                        'TELECOM',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: primaryRed,
                          letterSpacing: 8,
                        ),
                      ),
                    ],
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
                const SizedBox(height: 24),
                const Text(
                  'INICIANDO EXPERIÊNCIA',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.white24,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          
          // Version info at bottom
          const Positioned(
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
          ),
        ],
      ),
    );
  }
}
