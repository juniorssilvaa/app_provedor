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
  final Color accentCyan = const Color(0xFF00E5FF);
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
        elevation: 0,
        title: const Text('NOTAS FISCAIS', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 16, letterSpacing: 2)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: accentCyan))
          : _notes.isEmpty
              ? _buildEmptyState()
              : RefreshIndicator(
                  onRefresh: _loadNotes,
                  color: accentCyan,
                  backgroundColor: cardBg,
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
    final String empresa = note['empresa_nome_fantasia'] ?? note['empresa_razao_social'] ?? 'JOCA NET';
    
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

    // Formatação de Valor
    double valorNum = double.tryParse(note['valortotal']?.toString() ?? note['valor']?.toString() ?? '0') ?? 0.0;
    String valorFormatado = 'R\$ ${valorNum.toStringAsFixed(2).replaceAll('.', ',')}';
    
    final String? link = note['link'] ?? note['link_pdf'] ?? note['url'];

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Cabeçalho Centralizado com Icone no Topo
            Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A1A1A),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(Icons.receipt_long_rounded, color: accentCyan, size: 28),
                ),
                const SizedBox(height: 16),
                Text(
                  'Nota Fiscal Nº $numero',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  width: 200, // Força a quebra de linha se for longo
                  child: Text(
                    empresa.toUpperCase(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: accentCyan,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Informações: Data e Valor
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DATA DE EMISSÃO',
                      style: TextStyle(
                        color: accentCyan.withOpacity(0.6),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      dataFormatada,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'VALOR TOTAL',
                      style: TextStyle(
                        color: accentCyan.withOpacity(0.6),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      valorFormatado,
                      style: TextStyle(
                        color: accentCyan,
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 32),

            // Botão de Download
            ElevatedButton(
              onPressed: () => _openNoteLink(link),
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryNavy,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 58),
                shape: const StadiumBorder(),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.download_rounded, size: 24),
                  SizedBox(width: 12),
                  Text(
                    'BAIXAR DOCUMENTO FISCAL',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}