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
    // Aguardar 2 segundos para mostrar o splash
    await Future.delayed(const Duration(seconds: 2));
    
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
    return Scaffold(
      backgroundColor: const Color(0xFF1A1F2E),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Logo
            Column(
              children: [
                Image.asset(
                  'assets/images/logo.png',
                  width: 120,
                  height: 120,
                  errorBuilder: (context, error, stackTrace) {
                    return const Icon(Icons.network_check, size: 120, color: Colors.blue);
                  },
                ),
                const SizedBox(height: 24),
                const Text(
                  'NANET',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blue),
            ),
            const SizedBox(height: 16),
            const Text(
              'Carregando...',
              style: TextStyle(
                fontSize: 14,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
