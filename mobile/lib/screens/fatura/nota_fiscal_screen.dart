import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../provider.dart';

class NotaFiscalScreen extends StatefulWidget {
  const NotaFiscalScreen({super.key});

  @override
  State<NotaFiscalScreen> createState() => _NotaFiscalScreenState();
}

class _NotaFiscalScreenState extends State<NotaFiscalScreen> {
  bool _isLoading = true;
  List<dynamic> _notes = [];
  
  final Color primaryNavy = const Color(0xFF1A237E);
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
          final result = await provider.sgpService?.getFiscalNotes(
            provider.cpf!,
            provider.centralPassword!,
            contractId,
          );
          if (result != null) {
            setState(() {
              _notes = result;
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

  Future<void> _openNoteLink(String? url) async {
    if (url == null || url.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link da nota fiscal não disponível')));
      }
      return;
    }
    final uri = Uri.parse(url);
    try {
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível abrir a nota fiscal')));
        }
      }
    } catch (e) {
      debugPrint('Erro ao abrir link: $e');
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
          Icon(Icons.description_outlined, size: 80, color: Colors.white24),
          const SizedBox(height: 16),
          const Text(
            'Nenhuma nota fiscal encontrada',
            style: TextStyle(color: Colors.grey, fontSize: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildNoteItem(Map<String, dynamic> note) {
    final String numero = note['numero']?.toString() ?? 'S/N';
    final String empresa = note['empresa_nome_fantasia'] ?? note['empresa_razao_social'] ?? 'Provedor';
    
    // Formatação de Data
    String dataRaw = note['data_emissao'] ?? note['data_cadastro'] ?? '';
    String dataFormatada = '--/--/----';
    if (dataRaw.isNotEmpty) {
      try {
        DateTime dt = DateTime.parse(dataRaw.split(' ')[0]);
        dataFormatada = DateFormat('dd/MM/yyyy').format(dt);
      } catch (_) {
        dataFormatada = dataRaw;
      }
    }

    // Formatação de Valor (SGP usa 'valortotal')
    double valorNum = double.tryParse(note['valortotal']?.toString() ?? note['valor']?.toString() ?? '0') ?? 0.0;
    String valorFormatado = 'R\$ ${valorNum.toStringAsFixed(2).replaceAll('.', ',')}';
    
    final String? link = note['link'] ?? note['link_pdf'] ?? note['url'];

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: primaryNavy.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: const Icon(Icons.receipt_long_rounded, color: Color(0xFF00E5FF), size: 28),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Nota Fiscal Nº $numero',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          empresa.toUpperCase(),
                          style: TextStyle(
                            color: const Color(0xFF00E5FF).withOpacity(0.8),
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(color: Colors.white.withOpacity(0.05), height: 1),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'DATA DE EMISSÃO',
                        style: TextStyle(color: Colors.grey, fontSize: 10, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        dataFormatada,
                        style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'VALOR TOTAL',
                        style: TextStyle(color: Colors.grey, fontSize: 10, letterSpacing: 1.2),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        valorFormatado,
                        style: const TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (link != null)
              InkWell(
                onTap: () => _openNoteLink(link),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: primaryNavy.withOpacity(0.2),
                    border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.download_rounded, color: Color(0xFF00E5FF), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'BAIXAR DOCUMENTO FISCAL',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoMiniTag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white10),
      ),
      child: Text(
        text,
        style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold),
      ),
    );
  }
}
