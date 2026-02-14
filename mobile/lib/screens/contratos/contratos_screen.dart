import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../provider.dart';

class ContratosScreen extends StatefulWidget {
  const ContratosScreen({super.key});

  @override
  State<ContratosScreen> createState() => _ContratosScreenState();
}

class _ContratosScreenState extends State<ContratosScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _contractDetails;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchContractDetails();
  }

  Future<void> _fetchContractDetails() async {
    final provider = context.read<AppProvider>();
    final cpf = provider.cpf;

    if (cpf == null) {
      if (mounted) {
        setState(() {
           _isLoading = false;
           _errorMessage = 'Sessão inválida.';
        });
      }
      return;
    }

    try {
      if (provider.sgpService != null) {
        final result = await provider.sgpService!.getConsultaCliente(cpf);
        
        if (result.containsKey('contratos') && (result['contratos'] as List).isNotEmpty) {
           final contratos = result['contratos'] as List;
           // Pega o contrato atual selecionado ou o primeiro
           final currentContractId = provider.userContract['id']?.toString() ?? provider.userContract['contratoId']?.toString();
           
           var targetContract;
           if (currentContractId != null) {
             targetContract = contratos.firstWhere(
               (c) => c['contratoId']?.toString() == currentContractId,
               orElse: () => contratos.first,
             );
           } else {
             targetContract = contratos.first;
           }

           if (mounted) {
             setState(() {
               _contractDetails = targetContract;
               _isLoading = false;
             });
           }
        } else {
          if (mounted) {
            setState(() {
              _isLoading = false;
              _errorMessage = 'Nenhum contrato encontrado.';
            });
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Erro ao carregar detalhes: $e';
        });
      }
    }
  }

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link indisponível')));
      return;
    }
    
    // Limpeza da URL (removendo crases ou espaços extras que vieram no exemplo)
    final cleanUrl = url.replaceAll('`', '').trim();
    final uri = Uri.parse(cleanUrl);

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível abrir o link')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryRed = const Color(0xFFFF0000);
    // Forçar fundo escuro/preto conforme solicitado implicitamente ("nome em branco")
    // e padrão geral do app que parece ser dark
    const backgroundColor = Color(0xFF121212); 
    const textColor = Colors.white;
    
    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        backgroundColor: primaryRed,
        title: const Text('CONTRATO ASSINADO', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryRed))
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.white)))
              : _buildContent(primaryRed, textColor),
    );
  }

  Widget _buildContent(Color primaryRed, Color textColor) {
    if (_contractDetails == null) return const SizedBox();

    // Extração dos dados
    String status = 'Não Disponível';
    String observacao = 'Não Disponível';
    String dataAssinatura = 'Não Disponível';
    String? urlAssinatura; // Ver Documento Assinado
    String? urlAssinado; // Ver Contrato

    if (_contractDetails!['assinaturaEletronica'] != null && 
        (_contractDetails!['assinaturaEletronica'] as List).isNotEmpty) {
      
      final assinatura = _contractDetails!['assinaturaEletronica'][0];
      
      // Tenta pegar status atual
      status = assinatura['status_atual'] ?? 'Desconhecido';

      // Tenta pegar observação de quem assinou (procura nos status históricos)
      if (assinatura['status'] is List) {
        final statusList = assinatura['status'] as List;
        final assinadoItem = statusList.firstWhere(
          (s) => s['status']?.toString().toUpperCase() == 'ASSINADO',
          orElse: () => null,
        );
        
        if (assinadoItem != null) {
          observacao = assinadoItem['observacao'] ?? '';
          // Remove prefixo se quiser limpar, ex "Assinado Por: "
          observacao = observacao.replaceAll('Assinado Por:', '').trim();
        }
      }

      // Data Assinatura
      if (assinatura['cliente'] != null) {
        dataAssinatura = assinatura['cliente']['data_assinatura'] ?? '';
        urlAssinatura = assinatura['cliente']['url_assinatura'];
      }

      // Url Contrato
      if (assinatura['documento'] != null) {
        urlAssinado = assinatura['documento']['url_assinado'];
      }
    }

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          // Info Card
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildInfoRow(Icons.info_outline, 'STATUS', status, primaryRed, textColor),
                const SizedBox(height: 24),
                _buildInfoRow(Icons.person_outline, 'ASSINADO POR', observacao, primaryRed, textColor),
                const SizedBox(height: 24),
                _buildInfoRow(Icons.calendar_today, 'DATA DA ASSINATURA', dataAssinatura, primaryRed, textColor),
              ],
            ),
          ),
          
          // Buttons Bottom
          Column(
            children: [
              _buildActionButton(
                'VER DOCUMENTO ASSINADO',
                urlAssinatura,
                primaryRed,
                textColor,
              ),
              const SizedBox(height: 16),
              _buildActionButton(
                'VER CONTRATO',
                urlAssinado,
                primaryRed,
                textColor,
              ),
              const SizedBox(height: 24),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, Color iconColor, Color textColor) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionButton(String label, String? url, Color color, Color textColor) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: url != null ? () => _openUrl(url) : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: textColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 0,
        ),
        child: Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ),
    );
  }
}
