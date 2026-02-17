import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../provider.dart';
import '../../models/cpe_info.dart';

class ConnectedDevicesScreen extends StatefulWidget {
  const ConnectedDevicesScreen({super.key});

  @override
  State<ConnectedDevicesScreen> createState() => _ConnectedDevicesScreenState();
}

class _ConnectedDevicesScreenState extends State<ConnectedDevicesScreen> {
  bool _isLoading = true;
  CpeInfo? _cpeInfo;
  String? _error;

  final Color primaryRed = const Color(0xFFFF0000);

  @override
  void initState() {
    super.initState();
    _fetchModemInfo();
  }

  Future<void> _fetchModemInfo() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final sgpService = appProvider.sgpService;

      if (sgpService == null) throw Exception("Serviço não inicializado");

      String contractId = appProvider.userContract['id']?.toString() ?? '';
      
      // Fallback if contractId is empty
      if (contractId.isEmpty) {
        final cpf = appProvider.cpf ?? '';
        final password = appProvider.centralPassword ?? '';
        final contracts = await sgpService.getContratos(cpf, password);
        if (contracts.isNotEmpty) {
           contractId = contracts[0]['id']?.toString() ?? contracts[0]['contrato']?.toString() ?? '';
        }
      }

      if (contractId.isNotEmpty) {
        final data = await sgpService.getModemInfo(contractId);
        if (data != null) {
          setState(() {
            _cpeInfo = CpeInfo.fromJson(data);
          });
        } else {
          throw Exception("Não foi possível obter informações do modem.");
        }
      } else {
        throw Exception("Contrato não identificado.");
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: primaryRed,
        title: const Text('Dispositivos Conectados', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFF0000)));
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Erro: $_error', style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchModemInfo,
              style: ElevatedButton.styleFrom(backgroundColor: primaryRed),
              child: const Text('Tentar Novamente', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      );
    }

    final devices = _cpeInfo?.connectedDevices ?? [];

    if (devices.isEmpty) {
      return const Center(child: Text('Nenhum dispositivo encontrado.', style: TextStyle(color: Colors.white)));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: devices.length,
      separatorBuilder: (_, __) => const Divider(color: Colors.white10),
      itemBuilder: (context, index) {
        final device = devices[index];
        final hostname = device['hostname'] ?? 'Desconhecido';
        final ip = device['ip'] ?? '-';
        final mac = device['mac'] ?? '-';
        
        return Container(
          decoration: BoxDecoration(
            color: const Color(0xFF111111),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            leading: CircleAvatar(
              backgroundColor: primaryRed.withOpacity(0.1),
              child: Icon(Icons.smartphone, color: primaryRed, size: 24),
            ),
            title: Text(
              hostname,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text('IP: $ip', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
                Text('MAC: $mac', style: TextStyle(color: Colors.grey[600], fontSize: 10)),
              ],
            ),
          ),
        );
      },
    );
  }
}
