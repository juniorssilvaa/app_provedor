import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cpfController = TextEditingController();
  bool _rememberMe = false;
  
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadSavedCpf();
  }

  Future<void> _loadSavedCpf() async {
    final prefs = await SharedPreferences.getInstance();
    final savedCpf = prefs.getString('saved_cpf');
    if (savedCpf != null) {
      setState(() {
        _cpfController.text = savedCpf;
        _rememberMe = true;
      });
    }
  }

  @override
  void dispose() {
    _cpfController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Ajuste para apontar para o backend local (10.0.2.2 para emulador Android)
      final response = await http.post(
        Uri.parse('http://10.0.2.2:8000/api/public/config/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'cpf': _cpfController.text,
        }),
      );

      if (response.statusCode == 200) {
        // Salvar CPF se "Lembrar" estiver marcado
        final prefs = await SharedPreferences.getInstance();
        if (_rememberMe) {
          await prefs.setString('saved_cpf', _cpfController.text);
        } else {
          await prefs.remove('saved_cpf');
        }

        // Obter provider_token da resposta (você precisará implementar um endpoint para isso)
        if (!mounted) return;
        final appState = context.read<AppState>();
        await appState.login(
          _cpfController.text,
          'simulated_token',
          'simulated_provider_token',
        );

        if (!mounted) return;
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        setState(() {
          _errorMessage = 'Credenciais inválidas. Tente novamente.';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Erro ao conectar com o servidor. Verifique sua conexão.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F), // Darker background to match image
      resizeToAvoidBottomInset: false, // Prevent resizing when keyboard opens
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(flex: 2), // Espaço flexível no topo
                
                // Logo
                Center(
                  child: Image.asset(
                    'assets/login_logo.png',
                    height: 300, // Reduzido para evitar overflow
                    errorBuilder: (context, error, stackTrace) {
                      return Column(
                        children: [
                          Icon(Icons.wifi, size: 50, color: Colors.red),
                          Text('NANET', style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
                        ],
                      );
                    },
                  ),
                ),
                
                const Spacer(flex: 1), // Espaço flexível entre logo e título
                
                // Título
                const Text(
                  'Acesse sua conta',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                
                const SizedBox(height: 8),
                const Text(
                  'Informe seu CPF ou CNPJ para começar',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.white60,
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Campo CPF/CNPJ
                TextFormField(
                  controller: _cpfController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: const Color(0xFF1E1E1E),
                    labelText: 'CPF/CNPJ',
                    labelStyle: const TextStyle(color: Colors.white60),
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.red),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.red),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.red, width: 2),
                    ),
                    errorStyle: const TextStyle(color: Colors.redAccent),
                  ),
                  style: const TextStyle(color: Colors.white),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Informe seu CPF ou CNPJ';
                    }
                    return null;
                  },
                ),
                
                const SizedBox(height: 12),
                
                // Checkbox Lembrar
                Row(
                  children: [
                    SizedBox(
                      height: 24,
                      width: 24,
                      child: Checkbox(
                        value: _rememberMe,
                        onChanged: (value) {
                          setState(() {
                            _rememberMe = value ?? false;
                          });
                        },
                        activeColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Lembrar meu CPF/CNPJ neste dispositivo',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Botão Entrar
                SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _login,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE50914), // Red color
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(28),
                      ),
                      elevation: 0,
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            'ENTRAR',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                  ),
                ),
                
                if (_errorMessage != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 14),
                    textAlign: TextAlign.center,
                  ),
                ],
                
                const Spacer(flex: 1),
                
                // Link Preciso de ajuda
                Center(
                  child: TextButton(
                    onPressed: () {
                      // TODO: Implementar ajuda
                    },
                    child: const Text(
                      'Preciso de ajuda?',
                      style: TextStyle(
                        color: Color(0xFFE50914),
                        decoration: TextDecoration.underline,
                        decorationColor: Color(0xFFE50914),
                      ),
                    ),
                  ),
                ),
                
                // Ver planos
                const SizedBox(height: 16),
                Center(
                  child: TextButton(
                    onPressed: () {
                      Navigator.of(context).pushNamed('/planos');
                    },
                    child: const Text(
                      'Ver planos',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
