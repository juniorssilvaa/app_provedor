import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../provider.dart';
import '../../services/sgp_service.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  bool _isLoading = false;
  List<dynamic> _tickets = [];

  final Color primaryRed = const Color(0xFFFF0000);
  final Color darkBackground = const Color(0xFF121212);
  final Color cardBackground = const Color(0xFF1E1E1E);
  final Color textGrey = const Color(0xFFAAAAAA);

  final _formKey = GlobalKey<FormState>();
  final _messageController = TextEditingController();
  String _selectedType = '1'; // Default: Sem Acesso
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _fetchTickets();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _fetchTickets() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final sgpService = appProvider.sgpService;

      if (sgpService == null) throw Exception("Serviço SGP não inicializado");

      String contractId = appProvider.userContract['id']?.toString() ?? '';
      final cpf = appProvider.cpf ?? '';
      final password = appProvider.centralPassword ?? '';

      if (contractId.isEmpty) {
        final contracts = await sgpService.getContratos(cpf, password);
        if (contracts.isNotEmpty) {
           contractId = contracts[0]['id']?.toString() ?? contracts[0]['contrato']?.toString() ?? '';
        }
      }

      if (contractId.isNotEmpty) {
        final data = await sgpService.getSupportTickets(cpf, password, contractId);
        setState(() {
          _tickets = data;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao buscar chamados: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _submitTicket() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    Navigator.of(context).pop(); // Close dialog

    try {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final sgpService = appProvider.sgpService;

      if (sgpService == null) throw Exception("Serviço SGP não inicializado");

      String contractId = appProvider.userContract['id']?.toString() ?? '';
      final cpf = appProvider.cpf ?? '';
      final password = appProvider.centralPassword ?? '';

      if (contractId.isEmpty) {
        final contracts = await sgpService.getContratos(cpf, password);
        if (contracts.isNotEmpty) {
           contractId = contracts[0]['id']?.toString() ?? contracts[0]['contrato']?.toString() ?? '';
        }
      }

      final result = await sgpService.openSupportTicket(
        cpf, 
        password, 
        contractId, 
        _selectedType,
        '${_messageController.text} - Chamado aberto Via app'
      );

      if (result.containsKey('error')) {
        throw Exception(result['error']);
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chamado aberto com sucesso!'), backgroundColor: Colors.green),
      );
      
      _messageController.clear();
      _fetchTickets(); // Refresh list

    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao abrir chamado: $e'), backgroundColor: Colors.red),
      );
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  void _openNewTicketDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: cardBackground,
        title: const Text('Novo Chamado', style: TextStyle(color: Colors.white)),
        content: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<String>(
                value: _selectedType,
                dropdownColor: cardBackground,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Tipo de Ocorrência',
                  labelStyle: TextStyle(color: Colors.grey),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
                  focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.red)),
                ),
                items: const [
                  DropdownMenuItem(value: '1', child: Text('Sem Acesso')),
                  DropdownMenuItem(value: '2', child: Text('Internet Lenta')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedType = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _messageController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  labelText: 'Mensagem',
                  labelStyle: TextStyle(color: Colors.grey),
                  enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.grey)),
                  focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.red)),
                ),
                maxLines: 3,
                validator: (value) => value == null || value.isEmpty ? 'Informe a mensagem' : null,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: _submitTicket,
            style: ElevatedButton.styleFrom(backgroundColor: primaryRed),
            child: const Text('Enviar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: darkBackground,
      appBar: AppBar(
        backgroundColor: primaryRed,
        title: const Text('SUPORTE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: primaryRed))
          : _tickets.isEmpty
              ? Center(child: Text('Nenhum chamado encontrado.', style: TextStyle(color: textGrey)))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tickets.length,
                  itemBuilder: (context, index) {
                    final ticket = _tickets[index];
                    // Map fields based on API response
                    final protocol = ticket['oc_protocolo']?.toString() ?? ticket['protocolo']?.toString() ?? 'N/A';
                    final subject = ticket['oc_tipo_descricao'] ?? ticket['assunto'] ?? 'Sem Assunto';
                    final description = ticket['oc_conteudo'] ?? ticket['mensagem'] ?? ticket['descricao'] ?? '';
                    
                    // Date parsing
                    String date = 'Data desconhecida';
                    final rawDate = ticket['oc_data_cadastro'] ?? ticket['data_abertura'] ?? ticket['data_cadastro'];
                    if (rawDate != null) {
                      date = rawDate.toString();
                    }
                    
                    final status = ticket['oc_status_descricao'] ?? ticket['status'] ?? 'Aberto';
                    
                    return _buildTicketCard(protocol, subject, description, date, status);
                  },
                ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openNewTicketDialog,
        backgroundColor: primaryRed,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('NOVO CHAMADO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildTicketCard(String protocol, String subject, String description, String date, String status) {
    Color statusColor = Colors.orange;
    if (status.toLowerCase().contains('fechado') || status.toLowerCase().contains('finalizado') || status.toLowerCase().contains('resolvido')) {
      statusColor = Colors.green;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border(
            left: BorderSide(color: primaryRed, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Protocolo: $protocol',
                style: TextStyle(color: textGrey, fontSize: 12),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            subject,
            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          if (description.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              description,
              style: TextStyle(color: textGrey, fontSize: 14),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.bottomRight,
            child: Text(
              date,
              style: TextStyle(color: textGrey, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
