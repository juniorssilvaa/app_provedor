import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../services.dart';
import '../../main.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _ssid = 'Não conectado';
  int? _signalStrength;
  String _ipAddress = '---';
  bool _isConnected = false;
  
  Map<String, dynamic>? _contract = {};
  Map<String, dynamic>? _lastInvoice = {};

  @override
  void initState() {
    super.initState();
    _loadData();
    _checkConnection();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final contractJson = prefs.getString('userContract');
    
    if (contractJson != null) {
      setState(() {
        _contract = {'name': 'PLANO PREMIUM 300MB', 'status': 'active', 'address': 'RUA MANOEL MARQUES DA CUNHA, 339'};
        _lastInvoice = {'amount': 129.90, 'dueDate': '15/01/2026', 'status': 'pending'};
      });
    }
  }

  Future<void> _checkConnection() async {
    final connectivity = await Connectivity().checkConnectivity();
    setState(() {
      _isConnected = connectivity != ConnectivityResult.none;
      _ssid = _isConnected ? 'NANET_WiFi' : 'Não conectado';
    });
    
    // TODO: Implementar lógica real de telemetria
    if (_isConnected) {
      setState(() {
        _signalStrength = 75;
        _ipAddress = '192.168.1.100';
      });
    }
  }

  String _formatCurrency(double value) {
    return 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    
    return Scaffold(
      backgroundColor: const Color(0xFF1A1F2E),
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            floating: true,
            backgroundColor: Colors.transparent,
            leading: IconButton(
              icon: const Icon(Icons.menu, color: Colors.white),
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
            actions: [
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications, color: Colors.white),
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Notificações em breve!')),
                      );
                    },
                  ),
                  Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    child: const Text(
                      '2',
                      style: TextStyle(color: Colors.white, fontSize: 10),
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          // Content
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // User Card
                  _buildUserCard(),
                  
                  const SizedBox(height: 16),
                  
                  // Invoice Card
                  _buildInvoiceCard(),
                  
                  const SizedBox(height: 16),
                  
                  // Connection Card
                  _buildConnectionCard(),
                  
                  const SizedBox(height: 16),
                  
                  // Quick Access Grid
                  _buildQuickAccessGrid(),
                  
                  const SizedBox(height: 80), // Bottom padding
                ],
              ),
            ),
          ),
        ],
      ),
      drawer: _buildDrawer(context),
    );
  }

  Widget _buildUserCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.account_circle, size: 40, color: Colors.blue),
          ),
          
          const SizedBox(width: 12),
          
          // User Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'CONTRATO: 12345',
                        style: const TextStyle(color: Colors.white70, fontSize: 10),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'ATIVO',
                        style: const TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                Text(
                  'Cliente Exemplo',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _contract?['name'] ?? 'PREMIUM 300MB',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    'VENC. 15',
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                Container(
                                  width: 1,
                                  height: 12,
                                  color: Colors.white24,
                                ),
                                Expanded(
                                  child: Text(
                                    '15/01/2026',
                                    style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard() {
    if (_lastInvoice == null || _lastInvoice!.isEmpty) return const SizedBox.shrink();
    
    final isOverdue = _lastInvoice!['status'] == 'overdue';
    final statusColor = isOverdue ? Colors.red : Colors.orange;
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isOverdue ? Icons.warning : Icons.check_circle,
                    color: statusColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isOverdue ? 'FATURA ATRASADA' : 'FATURA ABERTA',
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ],
          ),
          
          const SizedBox(height: 12),
          
          // Amount
          Text(
            _formatCurrency(_lastInvoice!['amount']),
            style: const TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          
          Text(
            'Vencimento ${_lastInvoice!['dueDate']}',
            style: const TextStyle(
              fontSize: 14,
              color: Colors.white70,
            ),
          ),
          
          const SizedBox(height: 20),
          
          // Action Buttons
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF44336).withOpacity(0.8),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () {
                        Navigator.of(context).pushNamed('/fatura');
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.qr_code_scanner, color: Colors.white, size: 24),
                            SizedBox(width: 8),
                            Text(
                              'Pagar com PIX',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              
              const SizedBox(width: 12),
              
              // Boleto Button
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFF44336).withOpacity(0.8),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).pushNamed('/fatura');
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: const Center(
                      child: Icon(Icons.barcode_reader, color: Colors.white, size: 24),
                    ),
                  ),
                ),
              ),
              
              const SizedBox(width: 12),
              
              // Card Button
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFF44336).withOpacity(0.8),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      Navigator.of(context).pushNamed('/fatura');
                    },
                    borderRadius: BorderRadius.circular(8),
                    child: const Center(
                      child: Icon(Icons.credit_card, color: Colors.white, size: 24),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildConnectionCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.wifi, color: Colors.blue, size: 20),
              const SizedBox(width: 8),
              Text(
                'WI-FI',
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 4),
          
          // SSID
          Text(
            _ssid,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          
          const SizedBox(height: 12),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Signal
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sinal: ${_signalStrength ?? 0}%',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                  ),
                  // Progress Bar
                  Container(
                    width: 200,
                    height: 8,
                    decoration: BoxDecoration(
                      color: Colors.white10,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Stack(
                      children: [
                        Container(
                          width: ((_signalStrength ?? 0) / 100 * 200).toDouble(),
                          height: 8,
                          decoration: BoxDecoration(
                            color: _getSignalColor(_signalStrength ?? 0),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              // IP Address
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Icon(Icons.gps_fixed, color: Colors.blue, size: 24),
                  const SizedBox(height: 4),
                  Text(
                    'IP Local',
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                  Text(
                    _ipAddress,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Color _getSignalColor(int strength) {
    if (strength >= 80) return Colors.green;
    if (strength >= 60) return Colors.blue;
    if (strength >= 40) return Colors.orange;
    return Colors.red;
  }

  Widget _buildQuickAccessGrid() {
    final items = [
      {'icon': Icons.receipt_long, 'label': 'Faturas', 'route': '/fatura'},
      {'icon': Icons.lock_open, 'label': 'Reativar', 'route': '/home'},
      {'icon': Icons.support_agent, 'label': 'Suporte', 'route': '/home'},
      {'icon': Icons.show_chart, 'label': 'Consumo', 'route': '/home'},
      {'icon': Icons.notifications, 'label': 'Avisos', 'route': '/home'},
      {'icon': Icons.router, 'label': 'Modem', 'route': '/home'},
      {'icon': Icons.description, 'label': 'Contrato', 'route': '/home'},
      {'icon': Icons.speed, 'label': 'Speed Test', 'route': '/home'},
    ];
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 16),
          child: Text(
            'ACESSO RÁPIDO',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        ),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            childAspectRatio: 1,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            final item = items[index];
            return GestureDetector(
              onTap: () {
                Navigator.of(context).pushNamed(item['route'] as String);
              },
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF252B3D),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 56,
                      height: 56,
                      child: Icon(item['icon'] as IconData, color: Colors.blue, size: 28),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      item['label'] as String,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    return Drawer(
      child: Container(
        color: const Color(0xFF1A1F2E),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: BoxDecoration(
                color: Colors.blue,
              ),
              child: Column(
                children: [
                  const SizedBox(height: 60),
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    child: const Icon(Icons.account_circle, color: Colors.white, size: 40),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Cliente',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    appState.cpf ?? 'Não logado',
                    style: TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ),
            
            ListTile(
              leading: const Icon(Icons.home, color: Colors.white),
              title: const Text('Home', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.receipt, color: Colors.white),
              title: const Text('Faturas', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/fatura');
              },
            ),
            ListTile(
              leading: const Icon(Icons.grid_view, color: Colors.white),
              title: const Text('Planos', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/planos');
              },
            ),
            ListTile(
              leading: const Icon(Icons.support_agent, color: Colors.white),
              title: const Text('Suporte', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              leading: const Icon(Icons.chat, color: Colors.white),
              title: const Text('Assistente IA', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/ai_chat');
              },
            ),
            ListTile(
              leading: const Icon(Icons.person, color: Colors.white),
              title: const Text('Perfil', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.of(context).pop();
                Navigator.of(context).pushNamed('/perfil');
              },
            ),
            
            const Divider(color: Color(0xFF1AFFFFFF)),
            
            ListTile(
              leading: const Icon(Icons.exit_to_app, color: Colors.red),
              title: const Text('Sair', style: TextStyle(color: Colors.white)),
              onTap: () async {
                final appState = context.read<AppState>();
                await appState.logout();
                if (context.mounted) {
                  Navigator.of(context).pushReplacementNamed('/login');
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
