import 'package:flutter/material.dart';

class TermsScreen extends StatelessWidget {
  const TermsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Termos de Uso', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Termos e Condições de Uso',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Última atualização: 11 de Fevereiro de 2026',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 24),
            
            _buildSection(
              '1. Aceitação dos Termos',
              'Ao baixar e utilizar o aplicativo Nanet, você concorda com estes termos de uso. Este aplicativo destina-se exclusivamente a clientes ativos do provedor para gerenciamento de serviços de internet.',
              isDark
            ),
            _buildSection(
              '2. Acesso e Segurança',
              'O acesso ao aplicativo é feito através do seu CPF ou CNPJ. Você é responsável pelo uso do aplicativo em seu dispositivo, enquanto a Nanet garante a segurança e confidencialidade dos seus dados em nossos sistemas.',
              isDark
            ),
            _buildSection(
              '3. Funcionalidades',
              'O aplicativo permite:\n• Visualização e pagamento de faturas (via PIX ou código de barras);\n• Abertura e acompanhamento de chamados de suporte;\n• Alteração de senha e nome da rede Wi-Fi;\n• Teste de velocidade e diagnóstico de conexão;\n• Visualização de contratos e dados cadastrais.',
              isDark
            ),
            _buildSection(
              '4. Uso Adequado',
              'Você concorda em não utilizar o aplicativo para:\n• Praticar atos ilícitos ou fraudulentos;\n• Tentar violar a segurança do sistema;\n• Modificar configurações de equipamentos de rede de forma a prejudicar a rede do provedor.',
              isDark
            ),
            _buildSection(
              '5. Alterações no Serviço',
              'A Nanet reserva-se o direito de modificar, suspender ou descontinuar funcionalidades do aplicativo a qualquer momento, visando melhorias ou manutenção.',
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
