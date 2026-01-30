import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PerfilScreen extends StatefulWidget {
  const PerfilScreen({super.key});

  @override
  State<PerfilScreen> createState() => _PerfilScreenState();
}

class _PerfilScreenState extends State<PerfilScreen> {
  String? _name;
  String? _cpf;
  String? _email;
  String? _phone;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _name = prefs.getString('userName');
      _cpf = prefs.getString('cpf');
      _email = prefs.getString('userEmail');
      _phone = prefs.getString('userPhone');
    });
  }

  Future<void> _saveProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('userName', _name ?? '');
    await prefs.setString('userEmail', _email ?? '');
    await prefs.setString('userPhone', _phone ?? '');

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Dados salvos com sucesso!')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1F2E),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Meu Perfil',
          style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const SizedBox(height: 16),
            
            // Avatar
            Center(
              child: Column(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.account_circle, size: 60, color: Colors.blue),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Foto do Perfil',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Form Fields
            TextFormField(
              controller: TextEditingController(text: _name),
              decoration: _buildInputDecoration('Nome Completo'),
              style: const TextStyle(color: Colors.white),
              onChanged: (value) => setState(() => _name = value),
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: TextEditingController(text: _cpf),
              keyboardType: TextInputType.number,
              decoration: _buildInputDecoration('CPF'),
              style: const TextStyle(color: Colors.white),
              onChanged: (value) => setState(() => _cpf = value),
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: TextEditingController(text: _email),
              keyboardType: TextInputType.emailAddress,
              decoration: _buildInputDecoration('E-mail'),
              style: const TextStyle(color: Colors.white),
              onChanged: (value) => setState(() => _email = value),
            ),
            
            const SizedBox(height: 16),
            
            TextFormField(
              controller: TextEditingController(text: _phone),
              keyboardType: TextInputType.phone,
              decoration: _buildInputDecoration('Telefone'),
              style: const TextStyle(color: Colors.white),
              onChanged: (value) => setState(() => _phone = value),
            ),
            
            const SizedBox(height: 32),
            
            // Save Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: _saveProfile,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'SALVAR ALTERAÇÕES',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Info Cards
            _buildInfoCard(
              'Endereço de Instalação',
              'RUA MANOEL MARQUES DA CUNHA, 339 - CENTRO, MARABÁ - PA',
              Icons.location_on,
            ),
            
            const SizedBox(height: 16),
            
            _buildInfoCard(
              'Contrato Principal',
              '12345',
              Icons.description,
            ),
            
            const SizedBox(height: 16),
            
            _buildInfoCard(
              'Data de Cadastro',
              '01/01/2024',
              Icons.calendar_today,
            ),
            
            const SizedBox(height: 32),
            
            // Logout Button
            SizedBox(
              height: 50,
              child: ElevatedButton(
                onPressed: () async {
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.clear();
                  if (context.mounted) {
                    Navigator.of(context).pushReplacementNamed('/login');
                  }
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.withOpacity(0.8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text(
                  'SAIR DA CONTA',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String label) {
    return InputDecoration(
      filled: true,
      fillColor: Colors.white.withOpacity(0.1),
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white70),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.white10),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.blue, width: 2),
      ),
    );
  }

  Widget _buildInfoCard(String title, String value, IconData icon) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: Colors.blue, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
            ],
          ),
        ),
      ],
    ),
  );
}
}
