import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _cpfController = TextEditingController();
  bool _isLoading = false;

  final Color primaryRed = const Color(0xFFFF0000);

  Future<void> _handleLogin() async {
    final cpf = _cpfController.text.trim();
    if (cpf.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor, informe seu CPF/CNPJ')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final provider = context.read<AppProvider>();
      
      // Simulação de login - Na vida real, chamaria um endpoint de auth
      // Aqui vamos usar o CPF para buscar o contrato no SGP via proxy
      // Mas para o MVP, vamos apenas logar e ir para a Home
      
      await provider.login(
        cpf: cpf,
        token: 'mock_token',
        providerToken: 'sk_live_mock_token', // Isso viria de uma config pública
        userName: 'Cliente Nanet',
      );

      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao entrar: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SingleChildScrollView(
        child: Container(
          height: MediaQuery.of(context).size.height,
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 50),
              // Logo Placeholder
              Column(
                children: [
                  Text(
                    'NANET',
                    style: TextStyle(
                      color: primaryRed,
                      fontSize: 48,
                      fontWeight: FontWeight.black,
                      letterSpacing: -2,
                    ),
                  ),
                  const Text(
                    'TELECOM',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 4,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 80),
              const Text(
                'Bem-vindo!',
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Acesse sua conta com CPF ou CNPJ',
                style: TextStyle(color: Colors.grey, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              TextField(
                controller: _cpfController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'CPF / CNPJ',
                  labelStyle: const TextStyle(color: Colors.grey),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Colors.white10),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: primaryRed),
                  ),
                  prefixIcon: const Icon(Icons.person_outline, color: Colors.grey),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryRed,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('ENTRAR', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
              const Spacer(),
              const Text(
                'NIOCHAT SERVIÇOS TECNOLÓGICOS',
                style: TextStyle(color: Colors.white24, fontSize: 10),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
