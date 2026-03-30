import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config.dart';
import '../provider.dart';
import '../main.dart'; // Para acessar o navigatorKey

class BlockedScreen extends StatelessWidget {
  const BlockedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Cores JocaNet
    const Color navyBlue = Color(0xFF001F3F);
    const Color accentCyan = Color(0xFF00E5FF);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: accentCyan.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.engineering,
                  size: 80,
                  color: navyBlue,
                ),
              ),
              const SizedBox(height: 32),
              const Text(
                'App em Manutenção',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: navyBlue,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              const Text(
                'Estamos realizando melhorias para melhor atendê-lo.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Caso precise de algo urgente, entre em contato com o seu provedor.',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: Colors.black87,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              ElevatedButton.icon(
                onPressed: () async {
                  final phone = AppConfig.supportPhone;
                  final digits = phone.replaceAll(RegExp(r'[^\d]'), '');
                  final message = Uri.encodeComponent('Preciso de ajuda para acessar o app');
                  final waDeepLink = Uri.parse("whatsapp://send?phone=$digits&text=$message");
                  final waWeb = Uri.parse("https://wa.me/$digits?text=$message");
                  
                  if (await canLaunchUrl(waDeepLink)) {
                    await launchUrl(waDeepLink, mode: LaunchMode.externalApplication);
                  } else if (await canLaunchUrl(waWeb)) {
                    await launchUrl(waWeb, mode: LaunchMode.externalApplication);
                  }
                },
                icon: const Icon(Icons.chat),
                label: const Text('Falar com o Provedor'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: navyBlue,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: () async {
                  await Provider.of<AppProvider>(context, listen: false).logout();
                },
                icon: const Icon(Icons.logout),
                label: const Text('Voltar para o Login'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.grey[700],
                  side: BorderSide(color: Colors.grey[300]!),
                  minimumSize: const Size(double.infinity, 56),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
