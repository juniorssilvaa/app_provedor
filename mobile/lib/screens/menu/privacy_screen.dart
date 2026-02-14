import 'package:flutter/material.dart';

class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Política de Privacidade', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Política de Privacidade',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Última atualização: 11 de Fevereiro de 2026',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 24),
            
            _buildSection(
              '1. Coleta de Dados',
              'Para fornecer nossos serviços, coletamos as seguintes informações:\n• Dados Pessoais: Nome, CPF, endereço e contatos, conforme cadastro prévio em nosso sistema;\n• Dados do Dispositivo: Modelo, sistema operacional e identificadores únicos para diagnóstico e envio de notificações;\n• Dados de Conexão: Status da rede, consumo de dados e diagnósticos de Wi-Fi.',
              isDark
            ),
            _buildSection(
              '2. Uso das Informações',
              'Utilizamos seus dados para:\n• Autenticar seu acesso ao aplicativo;\n• Processar pagamentos e gerar faturas;\n• Fornecer suporte técnico e diagnóstico remoto;\n• Enviar notificações importantes sobre manutenções ou vencimentos;\n• Melhorar a qualidade do nosso serviço de internet.',
              isDark
            ),
            _buildSection(
              '3. Compartilhamento de Dados',
              'Seus dados não são vendidos ou compartilhados com terceiros para fins de marketing. O compartilhamento ocorre apenas quando estritamente necessário para:\n• Processamento de pagamentos (Gateways de pagamento);\n• Cumprimento de obrigações legais ou regulatórias.',
              isDark
            ),
            _buildSection(
              '4. Segurança',
              'Adotamos medidas técnicas e administrativas para proteger seus dados contra acessos não autorizados, perdas ou alterações. Toda a comunicação com nossos servidores é criptografada.',
              isDark
            ),
            _buildSection(
              '5. Seus Direitos',
              'Você tem o direito de solicitar o acesso, correção ou exclusão de seus dados pessoais, respeitando os prazos legais de guarda de registros previstos no Marco Civil da Internet.',
              isDark
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18, 
              fontWeight: FontWeight.bold,
              color: Color(0xFFFF0000),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: TextStyle(
              fontSize: 15,
              height: 1.5,
              color: isDark ? Colors.grey[300] : Colors.grey[800],
            ),
          ),
        ],
      ),
    );
  }
}
