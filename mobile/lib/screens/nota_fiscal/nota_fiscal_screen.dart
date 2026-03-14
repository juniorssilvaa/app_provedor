import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/app_provider.dart';

class NotaFiscalScreen extends StatefulWidget {
  const NotaFiscalScreen({super.key});

  @override
  State<NotaFiscalScreen> createState() => _NotaFiscalScreenState();
}

class _NotaFiscalScreenState extends State<NotaFiscalScreen> {
  bool _isLoading = true;
  List<dynamic> _notes = [];
  
  final Color primaryNavy = const Color(0xFF0073B7);
  final Color cardBg = const Color(0xFF111111);

  @override
  void initState() {
    super.initState();
    _loadNotes();
  }

  Future<void> _loadNotes() async {
    setState(() => _isLoading = true);
    try {
      final provider = context.read<AppProvider>();
      if (provider.cpf != null && provider.centralPassword != null) {
        final contractId = (provider.userContract['id'] ?? provider.userContract['contract_id'])?.toString();
        if (contractId != null) {
          final notes = await provider.sgpService?.getFiscalNotes(
            provider.cpf!,
            provider.centralPassword!,
            contractId,
          );
          
          if (notes != null) {
            setState(() {
              _notes = notes;
            });
          }
        }
      }
    } catch (e) {
      debugPrint('Erro ao carregar notas fiscais: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: primaryNavy,
        title: const Text('Notas Fiscais', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryNavy))
          : _notes.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadNotes,
                  color: primaryNavy,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _notes.length,
                    itemBuilder: (context, index) {
                      return _buildNoteItem(_notes[index]);
                    },
                  ),
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
            'Nenhuma nota fiscal encontrada',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Future<void> _openNoteLink(String? url) async {
    if (url == null || url.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link da nota não disponível')));
      }
      return;
    }
    final uri = Uri.parse(url);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (!await launchUrl(uri, mode: LaunchMode.platformDefault)) {
           if (mounted) {
             ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível abrir a nota fiscal')));
           }
        }
      }
    } catch (e) {
      debugPrint('Erro ao abrir link: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Erro ao tentar abrir a nota fiscal')));
      }
    }
  }

  Widget _buildNoteItem(Map<String, dynamic> note) {
    // Formatação de Data
    String dataEmissao = '--/--/----';
    try {
      final rawDate = note['data_emissao'];
      if (rawDate != null) {
        final parsedDate = DateTime.parse(rawDate);
        dataEmissao = DateFormat('dd/MM/yyyy').format(parsedDate);
      }
    } catch (_) {}

    final String numero = note['numero']?.toString() ?? 'N/A';
    final String empresa = note['empresa_razao_social'] ?? 'Provedor de Internet';
    final double valorRaw = double.tryParse(note['valortotal']?.toString() ?? '0') ?? 0.0;
    final String valor = valorRaw.toStringAsFixed(2).replaceAll('.', ',');

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
                  color: Colors.blue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  'NOTA FISCAL',
                  style: TextStyle(
                    color: Colors.blue,
                    fontWeight: FontWeight.bold,
                    fontSize: 10,
                  ),
                ),
              ),
              Text(
                'Emissão $dataEmissao',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Nº $numero',
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            empresa,
            style: const TextStyle(color: Colors.white70, fontSize: 14),
          ),
          const SizedBox(height: 12),
          Text(
            'R\$ $valor',
            style: TextStyle(color: primaryNavy, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: () => _openNoteLink(note['link']),
            icon: const Icon(Icons.download_rounded),
            label: const Text('VISUALIZAR NOTA FISCAL', style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: primaryNavy,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 50),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
    );
  }
}
