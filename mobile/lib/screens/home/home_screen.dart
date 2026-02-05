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
  String _ssid = 'ASNET TELECOM_5G';
  int _signalStrength = 100;
  String _ipAddress = '192.168.1.2';
  bool _isConnected = true;
  
  Map<String, dynamic> _contract = {
    'id': '1',
    'status': 'active',
    'address': 'RUA DO CAMPO, 270 - JARDIM JORDÃO'
  };
  
  Map<String, dynamic> _lastInvoice = {
    'amount': 50.00,
    'dueDate': '29/06/2025',
    'status': 'pending'
  };

  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF111111);
  final Color scaffoldBg = const Color(0xFF000000);

  @override
  void initState() {
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: scaffoldBg,
      body: SafeArea(
        child: Column(
          children: [
            // Custom App Bar
            _buildAppBar(),
            
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    _buildUserCard(),
                    const SizedBox(height: 16),
                    _buildInvoiceCard(),
                    const SizedBox(height: 16),
                    _buildWifiCard(),
                    const SizedBox(height: 16),
                    _buildAIAssistantCard(),
                    const SizedBox(height: 24),
                    _buildQuickAccess(),
                    const SizedBox(height: 100), // Bottom padding for nav bar
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(),
      floatingActionButton: _buildCentralButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildAppBar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Image.asset(
                'assets/images/logo.png', // Assuming logo is there or placeholder
                height: 40,
                errorBuilder: (context, error, stackTrace) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'NANET',
                      style: TextStyle(
                        color: primaryRed,
                        fontSize: 24,
                        fontWeight: FontWeight.black,
                        letterSpacing: -1,
                      ),
                    ),
                    const Text(
                      'TELECOM',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Colors.white, size: 28),
                onPressed: () {},
              ),
              Positioned(
                right: 8,
                top: 8,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: primaryRed, shape: BoxShape.circle),
                  constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                  child: const Text('1', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard() {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: primaryRed,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.person, color: Colors.white, size: 36),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Contrato: ${_contract['id']}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'ATIVO',
                            style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const Text(
                      'NANET',
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const Text(
                      'Versão: 1.0.0',
                      style: TextStyle(color: Colors.grey, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('FULL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    const Text('|', style: TextStyle(color: Colors.white24)),
                    const Text('VENC. 30', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    const Text('|', style: TextStyle(color: Colors.white24)),
                    const Text('29/05/2025', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
                const Divider(color: Colors.white10, height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _contract['address'],
                        style: const TextStyle(color: Colors.grey, fontSize: 11),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard() {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle_outline, color: Colors.orange[700], size: 20),
              const SizedBox(width: 8),
              Text(
                'FATURA ABERTA',
                style: TextStyle(color: Colors.orange[700], fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'R$ 50,00',
            style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
          ),
          const Text(
            'Vencimento 29/06/2025',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.qr_code, color: Colors.white),
                  label: const Text('Pagar com PIX', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildSmallIconButton(Icons.barcode_reader),
              const SizedBox(width: 8),
              _buildSmallIconButton(Icons.credit_card),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSmallIconButton(IconData icon) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: primaryRed,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: Colors.white),
    );
  }

  Widget _buildWifiCard() {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.wifi, color: primaryRed, size: 24),
              const SizedBox(width: 8),
              const Text('WI-FI', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          Text(_ssid, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: TextSpan(
                      children: [
                        const TextSpan(text: 'Sinal: ', style: TextStyle(color: Colors.grey)),
                        TextSpan(
                          text: '$_signalStrength% (Excelente)',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.wifi, color: primaryRed, size: 12),
                      const SizedBox(width: 4),
                      const Text('5 GHz', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Icon(Icons.gps_fixed, color: primaryRed, size: 24),
                  const Text('IP Local', style: TextStyle(color: Colors.grey, fontSize: 10)),
                  Text(_ipAddress, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _signalStrength / 100,
              backgroundColor: Colors.white10,
              color: Colors.green,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('0%', style: TextStyle(color: Colors.grey, fontSize: 10)),
              Text('100%', style: TextStyle(color: Colors.grey, fontSize: 10)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAIAssistantCard() {
    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.smart_toy, color: primaryRed, size: 24),
              const SizedBox(width: 8),
              const Text('Assistente IA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            'Suporte inteligente para seu Wi-Fi e financeiro.',
            style: TextStyle(color: Colors.grey, fontSize: 14),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/ai_chat'),
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('Falar com Assistente'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildAOSButton(Icons.whatsapp), // Placeholder for WhatsApp
              const SizedBox(width: 8),
              _buildAOSButton(Icons.phone),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAOSButton(IconData icon) {
    return Container(
      width: 54,
      height: 54,
      decoration: BoxDecoration(
        color: primaryRed,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: Colors.white),
    );
  }

  Widget _buildQuickAccess() {
    final List<Map<String, dynamic>> items = [
      {'icon': Icons.receipt, 'label': 'Faturas'},
      {'icon': Icons.lock_open, 'label': 'Reativar'},
      {'icon': Icons.headset_mic, 'label': 'Suporte'},
      {'icon': Icons.show_chart, 'label': 'Consumo'},
      {'icon': Icons.person_pin_circle, 'label': 'Atendimento'},
      {'icon': Icons.router, 'label': 'Modem'},
      {'icon': Icons.description, 'label': 'Contrato'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Acesso Rápido',
          style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 20,
            crossAxisSpacing: 20,
            childAspectRatio: 0.9,
          ),
          itemCount: items.length,
          itemBuilder: (context, index) {
            return Column(
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: primaryRed,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(items[index]['icon'], color: Colors.white, size: 32),
                ),
                const SizedBox(height: 8),
                Text(
                  items[index]['label'],
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildBottomNav() {
    return BottomAppBar(
      color: cardBg,
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      child: SizedBox(
        height: 60,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            IconButton(icon: Icon(Icons.home, color: primaryRed), onPressed: () {}),
            IconButton(icon: const Icon(Icons.receipt_long, color: Colors.grey), onPressed: () {}),
            const SizedBox(width: 40), // Space for FAB
            IconButton(icon: const Icon(Icons.chat, color: Colors.grey), onPressed: () {}),
            IconButton(icon: const Icon(Icons.menu, color: Colors.grey), onPressed: () {}),
          ],
        ),
      ),
    );
  }

  Widget _buildCentralButton() {
    return Container(
      width: 70,
      height: 70,
      decoration: BoxDecoration(
        color: Colors.green[600],
        shape: BoxShape.circle,
        border: Border.all(color: Colors.black, width: 4),
      ),
      child: const Icon(Icons.lock_open, color: Colors.white, size: 36),
    );
  }
}
