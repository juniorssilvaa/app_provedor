import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/services.dart';
import '../../provider.dart';

class FaturaScreen extends StatefulWidget {
  const FaturaScreen({super.key});

  @override
  State<FaturaScreen> createState() => _FaturaScreenState();
}

class _FaturaScreenState extends State<FaturaScreen> {
  bool _isLoading = true;
  List<dynamic> _invoices = [];
  
  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF111111);

  @override
  void initState() {
    super.initState();
    _loadInvoices();
  }

  Future<void> _loadInvoices() async {
    setState(() => _isLoading = true);
    try {
      final provider = context.read<AppProvider>();
      if (provider.cpf != null) {
        final faturas = await provider.sgpService?.getInvoices(provider.cpf!);
        setState(() {
          _invoices = faturas ?? [];
        });
      }
    } catch (e) {
      debugPrint('Erro ao carregar faturas: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: cardBg,
        title: const Text('Minhas Faturas', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryRed))
          : _invoices.isEmpty
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _invoices.length,
                  itemBuilder: (context, index) {
                    final fatura = _invoices[index];
                    return _buildInvoiceItem(fatura);
                  },
                ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.receipt_long, size: 80, color: Colors.white24),
          const SizedBox(height: 16),
          const Text(
            'Nenhuma fatura encontrada',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceItem(Map<String, dynamic> fatura) {
    final bool isPaid = fatura['status']?.toString().toUpperCase() == 'PAGO';
    final String valor = fatura['valor'] ?? '0.00';
    final String vencimento = fatura['data_vencimento'] ?? '--/--/----';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isPaid ? Colors.green.withOpacity(0.2) : Colors.orange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isPaid ? 'PAGO' : 'ABERTO',
                  style: TextStyle(
                    color: isPaid ? Colors.green : Colors.orange,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
              Text(
                'Venc. $vencimento',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'R\$ $valor',
            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          if (!isPaid)
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showPaymentOptions(fatura),
                    icon: const Icon(Icons.qr_code, size: 18),
                    label: const Text('PAGAR AGORA', style: TextStyle(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: primaryRed,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            )
          else
            const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.green, size: 16),
                SizedBox(width: 8),
                Text('Fatura quitada', style: TextStyle(color: Colors.grey, fontSize: 13)),
              ],
            ),
        ],
      ),
    );
  }

  void _showPaymentOptions(Map<String, dynamic> fatura) {
    showModalBottomSheet(
      context: context,
      backgroundColor: cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Escolha como pagar',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _buildPaymentOption(
              icon: Icons.qr_code_scanner,
              title: 'PIX Copia e Cola',
              subtitle: 'Pagamento instantâneo',
              onTap: () {
                final pix = fatura['pix_copia_e_cola'] ?? fatura['pix_code'] ?? '';
                Clipboard.setData(ClipboardData(text: pix));
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Código PIX copiado!')));
              },
            ),
            const SizedBox(height: 12),
            _buildPaymentOption(
              icon: Icons.barcode_reader,
              title: 'Boleto Bancário',
              subtitle: 'Compensação em até 48h',
              onTap: () {
                final barcode = fatura['linha_digitavel'] ?? fatura['barcode'] ?? '';
                Clipboard.setData(ClipboardData(text: barcode));
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Linha digitável copiada!')));
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentOption({required IconData icon, required String title, required String subtitle, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white10),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
              child: Icon(icon, color: primaryRed),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  Text(subtitle, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.white24),
          ],
        ),
      ),
    );
  }
}
