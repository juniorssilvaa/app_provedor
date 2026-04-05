import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../providers/app_provider.dart';
import '../../core/app_config.dart';

class FaturaScreen extends StatefulWidget {
  const FaturaScreen({super.key});

  @override
  State<FaturaScreen> createState() => _FaturaScreenState();
}

class _FaturaScreenState extends State<FaturaScreen> {
  bool _isLoading = true;
  List<dynamic> _invoices = [];
  bool _allPaid = false;
  
  final Color primaryNavy = const Color(0xFF0073B7);
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
        final rawFaturas = await provider.sgpService?.getInvoices(provider.cpf!);
        
        // Filtrar faturas pelo contrato selecionado
        List<dynamic> faturas = [];
        if (rawFaturas != null) {
          final selId = (provider.userContract['id'] ?? provider.userContract['contract_id'])?.toString();
          
          if (selId != null) {
            faturas = rawFaturas.where((inv) {
              if (inv is! Map) return false;
              final invContratoId = (inv['clienteContrato'] ?? inv['contrato_id'] ?? inv['contrato'] ?? inv['id_contrato'] ?? inv['numero_contrato'] ?? inv['contrato_id_display'])?.toString();
              return invContratoId != null && invContratoId.trim() == selId.trim();
            }).toList();
          } else {
            // Fallback se não houver contrato selecionado (não deveria ocorrer se logado)
            faturas = rawFaturas;
          }
        }

        if (faturas.isNotEmpty) {
          
          // 1. Processar datas e normalizar
          List<Map<String, dynamic>> processedInvoices = [];
          for (var f in faturas) {
             Map<String, dynamic> fatura = Map.from(f);
             String? rawDate = fatura['dataVencimento'] ?? fatura['data_vencimento'];
             if (rawDate != null) {
               try {
                 fatura['parsedDate'] = DateTime.parse(rawDate);
               } catch (_) {
                 fatura['parsedDate'] = DateTime(1900); // Fallback
               }
             } else {
               fatura['parsedDate'] = DateTime(1900);
             }
             processedInvoices.add(fatura);
          }

          // 2. Separar Pagas e Abertas
          final pagas = processedInvoices.where((f) {
            final status = f['status']?.toString().toUpperCase() ?? '';
            return status == 'PAGO' || status == 'BAIXADO';
          }).toList();

          final abertas = processedInvoices.where((f) {
            final status = f['status']?.toString().toUpperCase() ?? '';
            return status != 'PAGO' && status != 'BAIXADO' && status != 'CANCELADO';
          }).toList();

          // 3. Obter as 2 últimas pagas (Mais recentes primeiro)
          pagas.sort((a, b) => (b['parsedDate'] as DateTime).compareTo(a['parsedDate'] as DateTime));
          final ultimasPagas = pagas.take(2).toList();

          // 4. Ordenar abertas (Mais antiga primeiro - Prioridade para atrasadas)
          abertas.sort((a, b) => (a['parsedDate'] as DateTime).compareTo(b['parsedDate'] as DateTime));
          
          setState(() {
            _allPaid = abertas.isEmpty;
            _invoices = [...abertas, ...ultimasPagas];
          });

        } else {
          setState(() {
            _invoices = [];
            _allPaid = true;
          });
        }
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
        backgroundColor: const Color(0xFF0073B7),
        title: const Text('Minhas Faturas', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryNavy))
          : (_invoices.isEmpty && !_allPaid)
              ? _buildEmptyState()
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _invoices.length + (_allPaid ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (_allPaid) {
                      if (index == 0) return _buildCongratsCard();
                      return _buildInvoiceItem(_invoices[index - 1]);
                    }
                    return _buildInvoiceItem(_invoices[index]);
                  },
                ),
    );
  }

  Widget _buildCongratsCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.withOpacity(0.2), Colors.black],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.emoji_events_rounded, color: Colors.green, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Parabéns!',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Você está em dia com suas faturas.',
                  style: TextStyle(
                    color: Colors.grey[400],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
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

  Future<void> _openInvoiceLink(String? url) async {
    if (url == null || url.isEmpty) {
      if (mounted) {
        _showTopBanner('Link do boleto não disponível');
      }
      return;
    }
    final uri = Uri.parse(url);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        // Fallback para modo padrão se external falhar
        if (!await launchUrl(uri, mode: LaunchMode.platformDefault)) {
           if (mounted) {
             _showTopBanner('Não foi possível abrir o boleto');
           }
        }
      }
    } catch (e) {
      debugPrint('Erro ao abrir link: $e');
      if (mounted) {
        _showTopBanner('Erro ao tentar abrir o boleto');
      }
    }
  }

  Widget _buildInvoiceItem(Map<String, dynamic> fatura) {
    final statusRaw = fatura['status']?.toString().toUpperCase() ?? '';
    final bool isPaid = statusRaw == 'PAGO' || statusRaw == 'BAIXADO';
    
    double val = double.tryParse(fatura['valor']?.toString() ?? '0') ?? 0.0;
    final String valor = val.toStringAsFixed(2).replaceAll('.', ',');
    
    // Data Formatada
    final DateTime? parsedDate = fatura['parsedDate'];
    String vencimento = '--/--/----';
    if (parsedDate != null && parsedDate.year > 1900) {
      vencimento = DateFormat('dd/MM/yyyy').format(parsedDate);
    } else {
       vencimento = fatura['data_vencimento'] ?? '--/--/----';
    }

    // Status Dinâmico
    bool isLate = false;
    if (fatura['esta_atrasada'] != null) {
      isLate = fatura['esta_atrasada'] == true;
    } else if (!isPaid && parsedDate != null && parsedDate.year > 1900) {
        final now = AppConfig.getToday();
        final today = DateTime(now.year, now.month, now.day);
        final dateOnly = DateTime(parsedDate.year, parsedDate.month, parsedDate.day);
        
        // Verificação ultra-robusta na listagem
        if (dateOnly.year == today.year && dateOnly.month == today.month && dateOnly.day == today.day) {
          isLate = false;
        } else {
          isLate = dateOnly.isBefore(today);
        }
    }

    String statusLabel = isPaid ? 'PAGO' : (isLate ? 'ATRASADA' : 'ABERTO');
    Color statusColor = isPaid ? Colors.green : (isLate ? const Color(0xFFFF3333) : Colors.orange);

    // Valor Original e Corrigido
    double valOriginal = double.tryParse(fatura['valor']?.toString() ?? '0') ?? 0.0;
    double valCorrigido = double.tryParse(fatura['valorCorrigido']?.toString() ?? '') ?? valOriginal;
    
    final String valorExibido = (isLate && !isPaid) 
        ? valCorrigido.toStringAsFixed(2).replaceAll('.', ',')
        : valOriginal.toStringAsFixed(2).replaceAll('.', ',');
    
    final double jurosVal = valCorrigido - valOriginal;
    final String? jurosLabel = (isLate && !isPaid && jurosVal > 0)
        ? jurosVal.toStringAsFixed(2).replaceAll('.', ',')
        : null;

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
                  color: statusColor.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    color: statusColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
              if (jurosLabel != null)
                Text(
                  '+ R\$ $jurosLabel de juros',
                  style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              Text(
                'Venc. $vencimento',
                style: const TextStyle(color: Colors.white, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'R\$ $valorExibido',
            style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
          ),
          if (jurosLabel != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                'Valor original: R\$ ${valOriginal.toStringAsFixed(2).replaceAll('.', ',')}',
                style: const TextStyle(color: Colors.grey, fontSize: 12, decoration: TextDecoration.lineThrough),
              ),
            ),
          const SizedBox(height: 20),
          if (!isPaid)
            Column(
              children: [
                _buildActionButton(
                  iconWidget: SvgPicture.asset(
                    'assets/pix-svgrepo-com.svg',
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                  ),
                  label: 'COPIAR PIX',
                  backgroundColor: const Color(0xFF0073B7),
                  textColor: Colors.white,
                  onTap: () {
                    final pix = fatura['codigoPix'] ?? fatura['pix_copia_e_cola'] ?? fatura['pix_code'] ?? '';
                    if (pix.isNotEmpty) {
                      Clipboard.setData(ClipboardData(text: pix));
                      _showTopBanner('Código PIX copiado!');
                    } else {
                       _showTopBanner('Pix indisponível');
                    }
                  },
                ),
                const SizedBox(height: 10),
                _buildActionButton(
                  iconWidget: SvgPicture.asset(
                    'assets/barcode-svgrepo-com.svg',
                    width: 24,
                    height: 24,
                    colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                  ),
                  label: 'COPIAR CÓDIGO',
                  backgroundColor: const Color(0xFF0073B7),
                  textColor: Colors.white,
                  onTap: () {
                     final barcode = fatura['linhaDigitavel'] ?? fatura['linha_digitavel'] ?? fatura['codigoBarras'] ?? fatura['barcode'] ?? '';
                     if (barcode.isNotEmpty) {
                       Clipboard.setData(ClipboardData(text: barcode));
                       _showTopBanner('Linha digitável copiada!');
                     } else {
                        _showTopBanner('Código de barras indisponível');
                     }
                  },
                ),
                const SizedBox(height: 10),
                _buildActionButton(
                  iconWidget: const Icon(Icons.picture_as_pdf, size: 24),
                  label: 'BAIXAR BOLETO',
                  backgroundColor: const Color(0xFF0073B7),
                  textColor: Colors.white,
                  onTap: () {
                    String? link = fatura['link'] ?? fatura['link_cobranca'] ?? fatura['link_boleto'];
                    if (link != null) {
                      link = link.replaceAll('`', '').trim();
                      _openInvoiceLink(link);
                    } else {
                      _showTopBanner('Link do boleto não disponível');
                    }
                  },
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

  Widget _buildActionButton({
    required Widget iconWidget,
    required String label,
    required Color backgroundColor,
    required Color textColor,
    required VoidCallback onTap,
  }) {
    return ElevatedButton(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: textColor,
        minimumSize: const Size(double.infinity, 50),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: backgroundColor == Colors.transparent || backgroundColor == Colors.black ? const BorderSide(color: Colors.white24) : BorderSide.none,
        ),
      ),
      child: Stack(
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: SizedBox(
              width: 24,
              height: 24,
              child: Center(child: iconWidget),
            ),
          ),
          Center(
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              textAlign: TextAlign.center,
            ),
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
                _showTopBanner('Código PIX copiado!');
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
                _showTopBanner('Linha digitável copiada!');
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
              child: Icon(icon, color: primaryNavy),
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
  void _showTopBanner(String message) {
    if (!mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    messenger.removeCurrentMaterialBanner();
    messenger.showMaterialBanner(
      MaterialBanner(
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0073B7),
        elevation: 10,
        leading: const Icon(Icons.check_circle_outline, color: Colors.white),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        actions: [
          const SizedBox.shrink(),
        ],
      ),
    );
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) messenger.hideCurrentMaterialBanner();
    });
  }
}
