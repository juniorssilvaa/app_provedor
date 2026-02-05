import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../provider.dart';

class PerfilScreen extends StatelessWidget {
  const PerfilScreen({super.key});

  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF111111);

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AppProvider>();
    final userInfo = provider.userInfo;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: cardBg,
        title: const Text('Meu Perfil', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: cardBg,
                      shape: BoxShape.circle,
                      border: Border.all(color: primaryRed, width: 2),
                    ),
                    child: const Icon(Icons.person, color: Colors.white, size: 60),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(color: primaryRed, shape: BoxShape.circle),
                      child: const Icon(Icons.edit, color: Colors.white, size: 16),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              provider.userName ?? 'Usuário Nanet',
              style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(
              provider.cpf ?? '',
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
            const SizedBox(height: 40),
            _buildInfoSection('Dados Pessoais', [
              _buildInfoItem(Icons.email_outlined, 'E-mail', userInfo['email'] ?? 'A completar'),
              _buildInfoItem(Icons.phone_outlined, 'Telefone', userInfo['telefone'] ?? 'A completar'),
              _buildInfoItem(Icons.location_on_outlined, 'Endereço', provider.userContract['address'] ?? 'Consulte sua fatura'),
            ]),
            const SizedBox(height: 24),
            _buildInfoSection('Configurações', [
              _buildActionItem(Icons.notifications_none, 'Notificações', () {}),
              _buildActionItem(Icons.lock_outline, 'Segurança', () {}),
              _buildActionItem(Icons.help_outline, 'Ajuda e Suporte', () {}),
            ]),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  provider.logout();
                  Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
                },
                icon: const Icon(Icons.logout),
                label: const Text('SAIR DA CONTA'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: primaryRed,
                  side: BorderSide(color: primaryRed),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        ),
        Container(
          decoration: BoxDecoration(color: cardBg, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white10)),
          child: Column(children: items),
        ),
      ],
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Icon(icon, color: Colors.grey, size: 20),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
              Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionItem(IconData icon, String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(icon, color: Colors.grey, size: 20),
            const SizedBox(width: 16),
            Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w500)),
            const Spacer(),
            const Icon(Icons.chevron_right, color: Colors.white24),
          ],
        ),
      ),
    );
  }
}
