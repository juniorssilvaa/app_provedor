import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../provider.dart';
import '../../models/cpe_info.dart';

class WifiConfigScreen extends StatefulWidget {
  final CpeInfo? initialInfo;

  const WifiConfigScreen({super.key, this.initialInfo});

  @override
  State<WifiConfigScreen> createState() => _WifiConfigScreenState();
}

class _WifiConfigScreenState extends State<WifiConfigScreen> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _ssid2gController;
  late TextEditingController _pass2gController;
  late TextEditingController _ssid5gController;
  late TextEditingController _pass5gController;
  
  bool _obscure2g = true;
  bool _obscure5g = true;
  bool _isLoading = false;

  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF1E1E1E);

  @override
  void initState() {
    super.initState();
    print('DEBUG: WifiConfigScreen initialized');
    _ssid2gController = TextEditingController(text: widget.initialInfo?.ssid2g ?? '');
    _pass2gController = TextEditingController(text: widget.initialInfo?.password2g ?? '');
    _ssid5gController = TextEditingController(text: widget.initialInfo?.ssid5g ?? '');
    _pass5gController = TextEditingController(text: widget.initialInfo?.password5g ?? '');
  }

  @override
  void dispose() {
    _ssid2gController.dispose();
    _pass2gController.dispose();
    _ssid5gController.dispose();
    _pass5gController.dispose();
    super.dispose();
  }

  Future<void> _saveChanges() async {
    if (!_formKey.currentState!.validate()) return;

    // Show loading dialog
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        content: Row(
          children: const [
            CircularProgressIndicator(color: Color(0xFFFF0000)),
            SizedBox(width: 20),
            Expanded(
              child: Text(
                'Atualizando configurações de Wi-Fi, aguarde...',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );

    try {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final sgpService = appProvider.sgpService;

      if (sgpService == null) throw Exception("Serviço não inicializado");

      String contractId = appProvider.userContract['id']?.toString() ?? '';
      
      // Fallback logic for contract ID (same as info screen)
      if (contractId.isEmpty) {
        final cpf = appProvider.cpf ?? '';
        final password = appProvider.centralPassword ?? '';
        final contracts = await sgpService.getContratos(cpf, password);
        if (contracts.isNotEmpty) {
           contractId = contracts[0]['id']?.toString() ?? contracts[0]['contrato']?.toString() ?? '';
        }
      }

      if (contractId.isEmpty) throw Exception("Contrato não identificado");

      final success = await sgpService.changeWifi(
        contractId,
        ssid: _ssid2gController.text.isNotEmpty ? _ssid2gController.text : null,
        password: _pass2gController.text.isNotEmpty ? _pass2gController.text : null,
        ssid5g: _ssid5gController.text.isNotEmpty ? _ssid5gController.text : null,
        password5g: _pass5gController.text.isNotEmpty ? _pass5gController.text : null,
      );

      // Close loading dialog
      if (mounted) Navigator.pop(context);

      if (success) {
        if (mounted) {
          await showDialog(
            context: context,
            builder: (context) => AlertDialog(
              backgroundColor: const Color(0xFF1E1E1E),
              title: const Text('Sucesso!', style: TextStyle(color: Colors.white)),
              content: const Text(
                'As configurações foram enviadas para o modem com sucesso.\n\nA rede Wi-Fi poderá reiniciar em instantes.',
                style: TextStyle(color: Colors.white70),
              ),
              actions: [
                TextButton(
                  onPressed: () {
                    Navigator.pop(context); // Close dialog
                    Navigator.pop(context); // Go back to info screen
                  },
                  child: const Text('OK', style: TextStyle(color: Color(0xFFFF0000))),
                ),
              ],
            ),
          );
        }
      } else {
        throw Exception("Falha ao salvar configurações. Tente novamente.");
      }
    } catch (e) {
      // Close loading dialog if open
      if (mounted) Navigator.pop(context);
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: primaryRed,
        title: const Text('Configurar Wi-Fi', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSectionTitle('Rede Wi-Fi (2.4 GHz)'),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _ssid2gController,
                label: 'Nome da rede',
                icon: Icons.wifi,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _pass2gController,
                label: 'Senha',
                icon: Icons.lock_outline,
                isPassword: true,
                obscureText: _obscure2g,
                onToggleVisibility: () => setState(() => _obscure2g = !_obscure2g),
              ),
              const SizedBox(height: 32),

              _buildSectionTitle('Rede Wi-Fi (5 GHz)'),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _ssid5gController,
                label: 'Nome da rede',
                icon: Icons.wifi,
              ),
              const SizedBox(height: 16),
              _buildTextField(
                controller: _pass5gController,
                label: 'Senha',
                icon: Icons.lock_outline,
                isPassword: true,
                obscureText: _obscure5g,
                onToggleVisibility: () => setState(() => _obscure5g = !_obscure5g),
              ),
              const SizedBox(height: 40),

              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveChanges,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(25),
                    ),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text(
                          'Salvar Alterações',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Row(
      children: [
        Icon(Icons.wifi_tethering, color: primaryRed, size: 20),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(color: Colors.grey, fontSize: 14)),
      ],
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    bool obscureText = false,
    VoidCallback? onToggleVisibility,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          decoration: BoxDecoration(
            color: cardBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: TextFormField(
            controller: controller,
            obscureText: obscureText,
            style: const TextStyle(color: Colors.white),
            autovalidateMode: AutovalidateMode.onUserInteraction,
            validator: (value) {
              // Allow empty (no change)
              if (value == null || value.isEmpty) {
                return null; 
              }
              // If typed, check length
              if (isPassword && value.length < 8) {
                return 'A senha deve ter pelo menos 8 caracteres';
              }
              return null;
            },
            decoration: InputDecoration(
              labelText: label,
              labelStyle: const TextStyle(color: Colors.grey),
              prefixIcon: Icon(icon, color: primaryRed),
              suffixIcon: isPassword
                  ? IconButton(
                      icon: Icon(
                        obscureText ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                        color: Colors.grey,
                      ),
                      onPressed: onToggleVisibility,
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
        if (isPassword)
          Padding(
            padding: const EdgeInsets.only(left: 12, top: 4),
            child: Text(
              'Deixe em branco para manter a senha atual',
              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
            ),
          ),
      ],
    );
  }
}
