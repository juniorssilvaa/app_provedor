import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../providers/app_provider.dart';

class ContratosScreen extends StatefulWidget {
  const ContratosScreen({super.key});

  @override
  State<ContratosScreen> createState() => _ContratosScreenState();
}

class _ContratosScreenState extends State<ContratosScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _signatures = [];

  @override
  void initState() {
    super.initState();
    _loadSignatures();
  }

  Future<void> _loadSignatures() async {
    final provider = context.read<AppProvider>();
    final cpf = provider.cpf;
    final sgp = provider.sgpService;
    String? pass = provider.centralPassword;

    if (cpf == null || sgp == null) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Sessão inválida.';
      });
      return;
    }

    pass ??= cpf;

    try {
      // Busca contratos com o parâmetro assinatura_eletronica=1
      List<dynamic> contratos = [];
      try {
        contratos = await sgp.getContratos(cpf, pass);
      } catch (_) {
        try {
          contratos = await sgp.getContratos(cpf, cpf);
        } catch (_) {}
      }

      if (contratos.isEmpty) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Nenhum contrato encontrado.';
        });
        return;
      }

      final List<Map<String, dynamic>> parsedSignatures = [];

      for (var c in contratos) {
        if (c is! Map) continue;

        // Verifica se há assinaturas eletrônicas
        if (c['assinaturaEletronica'] != null && c['assinaturaEletronica'] is List) {
          final assinaturas = c['assinaturaEletronica'] as List;
          
          for (var ass in assinaturas) {
            if (ass is! Map) continue;
            
            // Extrai informações da assinatura
            final tipoDocumento = ass['tipo_documento'] ?? 'Documento';
            final statusAtual = ass['status_atual'] ?? 'Desconhecido';
            
            // Tenta obter observação e data do status 'Assinado' ou do status atual
            String observacao = '';
            String dataAssinatura = '';
            
            if (ass['status'] != null && ass['status'] is List) {
              final statusList = ass['status'] as List;
              // Procura pelo status 'Assinado'
              final assinadoStatus = statusList.firstWhere(
                (s) => s['status'] == 'Assinado',
                orElse: () => null,
              );
              
              if (assinadoStatus != null) {
                observacao = assinadoStatus['observacao'] ?? '';
                dataAssinatura = assinadoStatus['data_cadastro'] ?? '';
              } else {
                 // Se não achar 'Assinado', pega do primeiro status (mais recente)
                 if (statusList.isNotEmpty) {
                    observacao = statusList.first['observacao'] ?? '';
                    dataAssinatura = statusList.first['data_cadastro'] ?? '';
                 }
              }
            }
            
            // Se ainda não tiver data, tenta pegar de data_status_atual
            if (dataAssinatura.isEmpty) {
              dataAssinatura = ass['data_status_atual'] ?? '';
            }

            // URLs
            String urlAssinatura = '';
            String urlAssinado = '';
            
            if (ass['cliente'] != null && ass['cliente'] is Map) {
               urlAssinatura = ass['cliente']['url_assinatura'] ?? '';
            }
            
            if (ass['documento'] != null && ass['documento'] is Map) {
               urlAssinado = ass['documento']['url_assinado'] ?? '';
            }

            // Se não tiver URL de assinatura no cliente, tenta pegar da empresa
             if (urlAssinatura.isEmpty && ass['empresa'] != null && ass['empresa'] is Map) {
               urlAssinatura = ass['empresa']['url_assinatura'] ?? '';
            }


            parsedSignatures.add({
              'tipo_documento': tipoDocumento,
              'status': statusAtual,
              'observacao': observacao,
              'data_assinatura': dataAssinatura,
              'url_assinatura': urlAssinatura,
              'url_assinado': urlAssinado,
            });
          }
        }
      }

      setState(() {
        _signatures = parsedSignatures;
        _isLoading = false;
        if (_signatures.isEmpty) {
          _errorMessage = 'Nenhuma assinatura eletrônica encontrada.';
        }
      });
      
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Erro ao carregar assinaturas: $e';
      });
    }
  }

  Future<void> _launchUrl(String urlString) async {
    if (urlString.isEmpty) return;
    final urlStringTrimmed = urlString.trim();
    final Uri url = Uri.parse(urlStringTrimmed);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
       if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text('Não foi possível abrir o link: $urlStringTrimmed')),
         );
       }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final primaryNavy = const Color(0xFF0073B7);
    const backgroundColor = Color(0xFF121212);

    return Scaffold(
      backgroundColor: isDark ? backgroundColor : Colors.grey[50],
      appBar: AppBar(
        backgroundColor: primaryNavy,
        elevation: 0,
        title: const Text(
          'CONTRATOS ASSINADOS', 
          style: TextStyle(
            fontWeight: FontWeight.bold, 
            color: Colors.white
          )
        ),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryNavy))
          : _errorMessage != null
               ? Center(child: Text(_errorMessage!, style: TextStyle(color: isDark ? Colors.white : Colors.black)))
               : _buildList(isDark, primaryNavy),
    );
  }

  Widget _buildList(bool isDark, Color primaryNavy) {
    if (_signatures.isEmpty) {
      return Center(
        child: Text(
          'Nenhum documento encontrado', 
          style: TextStyle(color: isDark ? Colors.white70 : Colors.grey[600])
        ),
      );
    }
    
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _signatures.length,
      itemBuilder: (context, index) {
        final sig = _signatures[index];
        final tipo = sig['tipo_documento'] ?? 'Documento';
        final status = sig['status'] ?? '-';
        final obs = sig['observacao'] ?? '';
        final data = sig['data_assinatura'] ?? '';
        final urlAssinatura = sig['url_assinatura']?.toString().trim() ?? '';
        final urlAssinado = sig['url_assinado']?.toString().trim() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Ícone em destaque (como no menu)
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: primaryNavy.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        Icons.description_rounded,
                        color: primaryNavy,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    
                    // Conteúdo Principal
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  tipo,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isDark ? Colors.white : Colors.black,
                                  ),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: status == 'Assinado' || status == 'Finalizado' 
                                      ? Colors.green.withOpacity(0.1) 
                                      : Colors.orange.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  status,
                                  style: TextStyle(
                                    color: status == 'Assinado' || status == 'Finalizado' 
                                        ? Colors.green 
                                        : Colors.orange,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          
                          if (obs.isNotEmpty) ...[
                            Text(
                              obs.replaceFirst('Assinado Por: ', ''),
                              style: TextStyle(
                                color: isDark ? Colors.white70 : Colors.grey[700],
                                fontSize: 13,
                                fontWeight: FontWeight.w500
                              ),
                            ),
                            const SizedBox(height: 4),
                          ],
                          
                          if (data.isNotEmpty) ...[
                            Row(
                              children: [
                                Icon(Icons.calendar_today, 
                                  color: isDark ? Colors.white54 : Colors.grey[500], 
                                  size: 12
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  data,
                                  style: TextStyle(
                                    color: isDark ? Colors.white54 : Colors.grey[500],
                                    fontSize: 12
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                
                // Botões de Ação
                if (urlAssinatura.isNotEmpty || urlAssinado.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (urlAssinatura.isNotEmpty)
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _launchUrl(urlAssinatura),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryNavy,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.edit_document, size: 16),
                            label: const Text('Documento Assinado'),
                          ),
                        ),
                      
                      if (urlAssinatura.isNotEmpty && urlAssinado.isNotEmpty)
                        const SizedBox(width: 12),

                      if (urlAssinado.isNotEmpty)
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _launchUrl(urlAssinado),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: primaryNavy,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.visibility, size: 16),
                            label: const Text('Ver Contrato'),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
