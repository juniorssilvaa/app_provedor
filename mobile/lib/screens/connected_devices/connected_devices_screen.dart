import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../provider.dart';
<<<<<<< HEAD
import '../../models/cpe_info.dart';
=======
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)

class ConnectedDevicesScreen extends StatefulWidget {
  const ConnectedDevicesScreen({super.key});

  @override
  State<ConnectedDevicesScreen> createState() => _ConnectedDevicesScreenState();
}

class _ConnectedDevicesScreenState extends State<ConnectedDevicesScreen> {
  bool _isLoading = true;
<<<<<<< HEAD
  CpeInfo? _cpeInfo;
=======
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
  String? _error;

  final Color primaryRed = const Color(0xFFFF0000);

  @override
  void initState() {
    super.initState();
<<<<<<< HEAD
    _fetchModemInfo();
  }

  Future<void> _fetchModemInfo() async {
=======
    _fetchConnectedDevices();
  }

  Future<void> _fetchConnectedDevices() async {
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final appProvider = Provider.of<AppProvider>(context, listen: false);
      final sgpService = appProvider.sgpService;

      if (sgpService == null) throw Exception("Serviço não inicializado");

<<<<<<< HEAD
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
=======
      final contractId = appProvider.userContract['id']?.toString() ?? '';
      
      if (contractId.isNotEmpty) {
        final data = await sgpService.getConnectedDevices(contractId);
        if (data != null && data['devices'] != null) {
          setState(() {
            _devices = List<Map<String, dynamic>>.from(data['devices']);
          });
        } else {
          throw Exception("Não foi possível obter a lista de dispositivos.");
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
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

<<<<<<< HEAD
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
=======
  List<Map<String, dynamic>> _devices = [];

  IconData _getDeviceIcon(String hostname) {
    final h = hostname.toLowerCase();
    if (h.contains('iphone') || h.contains('android') || h.contains('phone') || h.contains('celular') || h.contains('mobile')) return Icons.smartphone;
    if (h.contains('tv') || h.contains('televisao') || h.contains('samsung') || h.contains('lg')) return Icons.tv;
    if (h.contains('pc') || h.contains('computador') || h.contains('desktop') || h.contains('notebook') || h.contains('laptop')) return Icons.computer;
    if (h.contains('ps4') || h.contains('ps5') || h.contains('xbox') || h.contains('nintendo') || h.contains('console')) return Icons.videogame_asset;
    return Icons.devices;
  }

  String _formatLeaseTime(dynamic seconds) {
    if (seconds == null || seconds == 0) return 'Indeterminado';
    try {
      final s = int.parse(seconds.toString());
      if (s > 3600) {
        return '${(s / 3600).toStringAsFixed(1)} horas restando';
      } else if (s > 60) {
        return '${(s / 60).toStringAsFixed(0)} minutos restando';
      }
      return '$s segundos restando';
    } catch (_) {
      return 'N/A';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        backgroundColor: primaryRed,
        elevation: 0,
        title: const Text('Dispositivos Conectados', 
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
<<<<<<< HEAD
      return const Center(child: CircularProgressIndicator(color: Color(0xFFFF0000)));
    }

    if (_error != null) {
=======
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
<<<<<<< HEAD
            Text('Erro: $_error', style: const TextStyle(color: Colors.white), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _fetchModemInfo,
              style: ElevatedButton.styleFrom(backgroundColor: primaryRed),
              child: const Text('Tentar Novamente', style: TextStyle(color: Colors.white)),
            ),
=======
            const CircularProgressIndicator(color: Color(0xFFFF0000)),
            const SizedBox(height: 20),
            Text('Escaneando sua rede...', 
              style: TextStyle(color: Colors.grey[400], fontSize: 14)),
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
          ],
        ),
      );
    }

<<<<<<< HEAD
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
=======
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.wifi_off_rounded, color: Colors.grey[800], size: 64),
              const SizedBox(height: 16),
              const Text('Ops! O modem não respondeu', 
                style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(_error!, 
                style: TextStyle(color: Colors.grey[500], fontSize: 14), 
                textAlign: TextAlign.center),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _fetchConnectedDevices,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Tentar Novamente', 
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_devices.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.router_outlined, color: Colors.grey[800], size: 64),
            const SizedBox(height: 16),
            const Text('Nenhum dispositivo encontrado', 
              style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchConnectedDevices,
      color: primaryRed,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        itemCount: _devices.length,
        itemBuilder: (context, index) {
          final device = _devices[index];
          final hostname = device['hostname'] ?? 'Dispositivo s/ nome';
          final ip = device['ip'] ?? '-';
          final mac = device['mac'] ?? '-';
          final active = device['active'] == true;
          final lease = device['lease_time'];
          
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF1A1A1A),
                  const Color(0xFF121212),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.05)),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.all(16),
              leading: Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: active ? primaryRed.withOpacity(0.1) : Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_getDeviceIcon(hostname), 
                  color: active ? primaryRed : Colors.grey[600], size: 28),
              ),
              title: Row(
                children: [
                  Expanded(
                    child: Text(
                      hostname,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (active)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text('ATIVO', 
                        style: TextStyle(color: Colors.green, fontSize: 8, fontWeight: FontWeight.bold)),
                    ),
                ],
              ),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(Icons.language, color: Colors.grey[600], size: 12),
                      const SizedBox(width: 4),
                      Text(ip, style: TextStyle(color: Colors.grey[400], fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.fingerprint, color: Colors.grey[600], size: 12),
                      const SizedBox(width: 4),
                      Text(mac, style: TextStyle(color: Colors.grey[600], fontSize: 11)),
                    ],
                  ),
                  if (active && lease != null && lease != 0) ...[
                    const SizedBox(height: 8),
                    Text(_formatLeaseTime(lease), 
                      style: const TextStyle(color: Color(0xFFFF5555), fontSize: 11, fontWeight: FontWeight.w500)),
                  ],
                ],
              ),
            ),
          );
        },
      ),
>>>>>>> 5039ff9 (Adiciona projeto mobile Nanet Telecom)
    );
  }
}
