import 'package:flutter/services.dart';
import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:network_info_plus/network_info_plus.dart' as network_plus;
import 'package:wifi_iot/wifi_iot.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../services.dart';
import '../../main.dart';
import '../../provider.dart';
import 'barcode_painter.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _ssid = 'Carregando...';
  int _signalStrength = 0;
  String _ipAddress = '-';
  bool _isConnected = false;
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  final Color primaryRed = const Color(0xFFFF0000);
  // Colors removed here, defined in build

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _initWifiListener();
      final provider = context.read<AppProvider>();
      provider.fetchAppConfig();
      // Inicializar serviço de Push Notifications e garantir registro do token
      provider.initPushService(); 
    });
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> _initWifiListener() async {
    // Check inicial
    try {
      final result = await Connectivity().checkConnectivity();
      _updateWifiInfo(result);
      
      // Solicita permissão de localização se não tiver
      // IMPORTANTE: Necessário para ler SSID no Android 8+
      if (await Permission.locationWhenInUse.request().isGranted) {
        // Força atualização após permissão
        final info = network_plus.NetworkInfo();
        final ssid = await info.getWifiName();
        if (ssid != null && mounted) {
          setState(() => _ssid = ssid.replaceAll('"', ''));
        }
      }
    } catch (e) {
      debugPrint('Erro check inicial connectivity: $e');
    }

    // Listener
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen(_updateWifiInfo);
  }

  Future<void> _updateWifiInfo(ConnectivityResult result) async {
    if (result == ConnectivityResult.wifi) {
      String? ssid;
      String? ip;
      int? signalStrength;
      
      try {
        var status = await Permission.locationWhenInUse.status;
        if (!status.isGranted) {
          await Permission.locationWhenInUse.request();
        }

        final info = network_plus.NetworkInfo();
        ssid = await info.getWifiName();
        ip = await info.getWifiIP();
        
        // Remove aspas do SSID se houver
        if (ssid != null) {
          ssid = ssid.replaceAll('"', '');
        }
        
        signalStrength = await WiFiForIoTPlugin.getCurrentSignalStrength();
      } catch (e) {
        debugPrint('Erro ao obter info WiFi: $e');
      }

      if (mounted) {
        setState(() {
          _ssid = ssid ?? 'Wi-Fi Conectado';
          _ipAddress = ip ?? '-';
          _isConnected = true;
          _signalStrength = _calculateSignalPercentage(signalStrength ?? -100);
        });
      }
    } else {
      if (mounted) {
        setState(() {
          _ssid = 'Wi-Fi desconectado';
          _ipAddress = '-';
          _isConnected = false;
          _signalStrength = 0;
        });
      }
    }
  }

  int _calculateSignalPercentage(int rssi) {
    // RSSI é negativo. Quanto mais próximo de 0, melhor.
    // -30 dBm: Incrível (100%)
    // -67 dBm: Muito Bom
    // -70 dBm: Bom
    // -80 dBm: Regular
    // -90 dBm: Ruim
    if (rssi >= -50) return 100;
    if (rssi >= -60) return 90;
    if (rssi >= -70) return 75;
    if (rssi >= -80) return 50;
    if (rssi >= -90) return 25;
    return 10;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? const Color(0xFF111111) : Colors.white;
    final scaffoldBg = theme.scaffoldBackgroundColor;
    final textColor = isDark ? Colors.white : Colors.black;
    final subTextColor = isDark ? Colors.grey : Colors.grey[700]!;
    
    return Scaffold(
      backgroundColor: scaffoldBg,
      extendBody: true, // Importante para o conteúdo passar por trás da barra
      body: SafeArea(
        bottom: false, // Permite que o conteúdo desça até o fundo
        child: Column(
          children: [
            // Custom App Bar
            _buildAppBar(isDark),
            
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  try {
                    await Provider.of<AppProvider>(context, listen: false).refreshData();
                  } catch (e) {
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Erro ao atualizar: $e')),
                      );
                    }
                  }
                },
                color: primaryRed,
                backgroundColor: cardBg,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      const SizedBox(height: 16),
                      _buildUserCard(cardBg, textColor, subTextColor, isDark),
                      const SizedBox(height: 16),
                      _buildInvoiceCard(cardBg, textColor, subTextColor, isDark),
                      const SizedBox(height: 16),
                      _buildWifiCard(cardBg, textColor, subTextColor, isDark),
                      const SizedBox(height: 16),
                      _buildAIAssistantCard(cardBg, textColor, subTextColor),
                      const SizedBox(height: 24),
                      _buildQuickAccess(textColor),
                      const SizedBox(height: 100), // Bottom padding for nav bar
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomNav(isDark),
      floatingActionButton: _buildCentralButton(),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }

  Widget _buildAppBar(bool isDark) {
    final provider = context.watch<AppProvider>();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Image.asset(
                'assets/logo.png',
                height: 148,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) => Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: 'NA',
                            style: TextStyle(
                              color: primaryRed,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -1,
                            ),
                          ),
                          TextSpan(
                            text: 'NET',
                            style: TextStyle(
                              color: isDark ? Colors.white : Colors.black,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -1,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'TELECOM',
                      style: TextStyle(
                        color: isDark ? Colors.white : Colors.grey[700],
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
                icon: Icon(Icons.notifications_none, color: isDark ? Colors.white : Colors.black, size: 28),
                onPressed: () => Navigator.pushNamed(context, '/notifications'),
              ),
              if (provider.unreadNotificationsCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: primaryRed, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${provider.unreadNotificationsCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _performUnlock(String contractId) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (c) => AlertDialog(
        backgroundColor: Colors.white,
        content: Row(
          children: const [
            CircularProgressIndicator(color: Color(0xFFFF0000)),
            SizedBox(width: 20),
            Expanded(
              child: Text(
                'Realizando desbloqueio...',
                style: TextStyle(color: Colors.black87),
              ),
            ),
          ],
        ),
      ),
    );
    
    try {
      final provider = Provider.of<AppProvider>(context, listen: false);
      final result = await provider.unlockContract(contractId);
      
      if (mounted) Navigator.pop(context); // Pop loading

      if (result['status'] == 1 || result['liberado'] == true) {
         final dias = result['liberado_dias']?.toString() ?? 'alguns';
         // Limpar mensagem para remover espaços extras e quebras de linha
         String msg = result['msg']?.toString() ?? 'Desbloqueio realizado com sucesso!';
         msg = msg.replaceAll(RegExp(r'\s+'), ' ').trim();

         if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(
               content: Column(
                 mainAxisSize: MainAxisSize.min,
                 crossAxisAlignment: CrossAxisAlignment.start,
                 children: [
                   const Text(
                     'Sucesso!',
                     style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                   ),
                   const SizedBox(height: 4),
                   Text('Desbloqueio realizado por $dias dias.'),
                 ],
               ),
               backgroundColor: Colors.green,
               behavior: SnackBarBehavior.floating,
               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
               margin: const EdgeInsets.all(16),
               duration: const Duration(seconds: 4),
             )
           );
         }
      } else {
         if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(
             SnackBar(content: Text(result['msg']?.toString() ?? 'Erro ao desbloquear'), backgroundColor: Colors.red)
           );
         }
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.red)
        );
      }
    }
  }

  Widget _buildUserCard(Color cardBg, Color textColor, Color subTextColor, bool isDark) {
    final provider = Provider.of<AppProvider>(context);
    final contract = provider.userContract;
    final userName = provider.userName ?? 'CLIENTE';
    final contractId = contract['id']?.toString() ?? 'N/A';
    final status = contract['status'] ?? 'ATIVO';
    final planName = contract['plan_name'] ?? 'PLANO BASICO';
    final address = contract['address'] ?? 'Endereço não informado';
    // Mostra a data de cadastro conforme solicitado
    final registrationDate = contract['registration_date'] ?? '24/10/2024';
    final contractDueDay = contract['contract_due_day'] ?? '30';

    // Se estiver suspenso, muda cores
    final statusUpper = status.toString().toUpperCase();
    final isSuspended = statusUpper.contains('SUSPENSO') || statusUpper.contains('BLOQUEADO') || statusUpper.contains('CANCELADO');

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
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.1) : Colors.grey[200],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(
                                  text: 'Contrato: ',
                                  style: TextStyle(color: subTextColor, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                                TextSpan(
                                  text: contractId,
                                  style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: isSuspended ? Colors.red.withOpacity(0.2) : Colors.green.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                status.toString().toUpperCase(),
                                style: TextStyle(
                                  color: isSuspended ? Colors.red : Colors.green,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            if (isSuspended) ...[
                              const SizedBox(width: 8),
                            ],
                          ],
                        ),
                      ],
                    ),
                    Text(
                      userName.toUpperCase(),
                      style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
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
              color: isDark ? Colors.black : Colors.grey[100],
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(planName, style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                    Text('|', style: TextStyle(color: isDark ? Colors.white24 : Colors.black26)),
                    Text('VENC. $contractDueDay', style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                    Text('|', style: TextStyle(color: isDark ? Colors.white24 : Colors.black26)),
                    Text(registrationDate, style: TextStyle(color: isDark ? Colors.white : Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
                Divider(color: isDark ? Colors.white10 : Colors.black12, height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        address,
                        style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Icon(Icons.keyboard_arrow_down, color: textColor),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCongratsCard(Color cardBg, Color textColor, Color subTextColor) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.withValues(alpha: 0.2), cardBg],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.green.withValues(alpha: 0.3)),
        boxShadow: [
          BoxShadow(
            color: Colors.green.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.emoji_events_rounded, color: Colors.green, size: 32),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Parabéns!',
                  style: TextStyle(
                    color: textColor,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Você está em dia com suas faturas.',
                  style: TextStyle(
                    color: subTextColor,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceCard(Color cardBg, Color textColor, Color subTextColor, bool isDark) {
    final provider = Provider.of<AppProvider>(context);
    final contract = provider.userContract;
    
    // Verifica se está tudo pago (definido no LoginScreen)
    if (contract['invoice_status_code'] == 'paid') {
      return _buildCongratsCard(cardBg, textColor, subTextColor);
    }

    final invoiceAmount = contract['last_invoice_value'] ?? contract['last_invoice_amount'] ?? '0,00';
    final invoiceDue = contract['last_invoice_due'] ?? contract['expiry_date'] ?? 'N/A';
    
    // Determina o status da fatura
    final isOverdue = contract['invoice_status_code'] == 'overdue';
    final statusText = isOverdue ? 'FATURA ATRASADA' : 'FATURA ABERTA';
    final statusColor = isOverdue ? const Color(0xFFFF3333) : Colors.orange[700];
    final statusIcon = isOverdue ? Icons.warning_amber_rounded : Icons.check_circle_outline;

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
              Icon(statusIcon, color: statusColor, size: 20),
              const SizedBox(width: 8),
              Text(
                statusText,
                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'R\$ $invoiceAmount',
            style: TextStyle(color: textColor, fontSize: 36, fontWeight: FontWeight.bold),
          ),
          Text(
            'Vencimento $invoiceDue',
            style: TextStyle(color: isOverdue ? const Color(0xFFFF3333) : Colors.grey, fontSize: 14, fontWeight: isOverdue ? FontWeight.bold : FontWeight.normal),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton(
                  onPressed: () {
                    final pixCode = contract['pix_code'];
                    if (pixCode != null && pixCode.isNotEmpty) {
                      Clipboard.setData(ClipboardData(text: pixCode));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Código PIX copiado com sucesso!')),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Código PIX não disponível')),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SvgPicture.asset(
                            'assets/pix-svgrepo-com.svg',
                            width: 30,
                            height: 30,
                            colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                          ),
                      const SizedBox(width: 8),
                      const Text('Pagar com PIX', style: TextStyle(fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              _buildSmallButton(
                CustomPaint(
                  size: const Size(24, 20),
                  painter: BarcodePainter(),
                ),
                onTap: () {
                  final barcode = contract['barcode'];
                  if (barcode != null && barcode.isNotEmpty) {
                    Clipboard.setData(ClipboardData(text: barcode));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Código de barras copiado com sucesso!')),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Código de barras não disponível')),
                    );
                  }
                },
              ),
              const SizedBox(width: 8),
              _buildSmallButton(const Icon(Icons.credit_card, color: Colors.white)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSmallButton(Widget content, {VoidCallback? onTap}) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: primaryRed,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Center(child: content),
        ),
      ),
    );
  }

  Widget _buildWifiCard(Color cardBg, Color textColor, Color subTextColor, bool isDark) {
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
              Text('WI-FI', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 16),
          Text(_ssid, style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.bold)),
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
                        TextSpan(text: 'Sinal: ', style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
                        TextSpan(
                          text: '$_signalStrength% (${_signalStrength >= 75 ? 'Excelente' : _signalStrength >= 50 ? 'Bom' : 'Fraco'})',
                          style: TextStyle(color: _signalStrength >= 50 ? Colors.green : Colors.orange, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.wifi, color: primaryRed, size: 12),
                      const SizedBox(width: 4),
                      Text('5 GHz', style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Icon(Icons.gps_fixed, color: primaryRed, size: 24),
                  Text('IP Local', style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold)),
                  Text(_ipAddress, style: TextStyle(color: textColor, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: _signalStrength / 100,
              backgroundColor: isDark ? Colors.white10 : Colors.black12,
              color: Colors.green,
              minHeight: 6,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('0%', style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold)),
              Text('100%', style: TextStyle(color: textColor, fontSize: 10, fontWeight: FontWeight.bold)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAIAssistantCard(Color cardBg, Color textColor, Color subTextColor) {
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
              Icon(FontAwesomeIcons.robot, color: primaryRed, size: 26),
              const SizedBox(width: 12),
              Text(
                'Assistente IA',
                style: TextStyle(
                  color: textColor,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Seu assistente inteligente, sempre pronto para ajudar.',
            style: TextStyle(color: subTextColor, fontSize: 14, height: 1.5),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/ai_chat'),
                  icon: const Icon(FontAwesomeIcons.solidComment, size: 20),
                  label: const Text(
                    'Falar com Assistente',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryRed,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              _buildActionIconButton(FontAwesomeIcons.whatsapp, () async {
                final phone = AppConfig.supportPhone.replaceAll(RegExp(r'[^\d]'), '');
                final url = Uri.parse("https://wa.me/$phone");
                if (await canLaunchUrl(url)) {
                  await launchUrl(url, mode: LaunchMode.externalApplication);
                } else {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Não foi possível abrir o WhatsApp')),
                    );
                  }
                }
              }), // WhatsApp Oficial
              const SizedBox(width: 12),
              _buildActionIconButton(FontAwesomeIcons.phone, () async {
                final url = Uri.parse("tel:${AppConfig.supportPhone}");
                if (await canLaunchUrl(url)) {
                  await launchUrl(url);
                } else {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Não foi possível realizar a chamada')),
                    );
                  }
                }
              }), // Telefone
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionIconButton(IconData icon, VoidCallback onTap) {
    return Material(
      color: primaryRed,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 54,
          height: 54,
          alignment: Alignment.center,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }

  Widget _buildQuickAccess(Color textColor) {
    final List<Map<String, dynamic>> masterItems = [
      {
        'ids': ['wifi', 'MEU WI-FI', 'meu_wifi'], 
        'icon': Icons.wifi_rounded, 
        'label': 'Meu Wi-Fi', 
        'route': '/wifi'
      },
      {
        'ids': ['CONSUMO', 'consumo'], 
        'icon': Icons.bar_chart_rounded, 
        'label': 'Consumo', 
        'route': '/consumo'
      },
      {
        'ids': ['cameras', 'CÂMERAS', 'cameras_cftv'], 
        'icon': Icons.videocam_rounded, 
        'label': 'Câmeras', 
        'route': null // '/cameras' - Tela ainda não implementada
      },
      {
        'ids': ['speed_test', 'FAST TEST', 'speedtest', 'SPEED_TEST'], 
        'icon': Icons.speed_rounded, 
        'label': 'Teste de Velocidade', 
        'route': '/speedtest'
      },
      {
        'ids': ['diagnostic', 'DIAGNÓSTICO WI-FI', 'wifi_diagnostic', 'DIAGNOSTICO WI-FI'], 
        'icon': Icons.network_check_rounded, 
        'label': 'Diagnóstico', 
        'route': null // '/diagnostic' - Tela ainda não implementada
      },
      {
        'ids': ['PLANOS', 'planos'], 
        'icon': Icons.layers_rounded, 
        'label': 'Planos', 
        'route': '/planos'
      },
      {
        'ids': ['contrato', 'CONTRATO', 'CONTRATO ASSINADO', 'contrato_assinado', 'CONTRATO_ASSINADO'],
        'icon': Icons.description_rounded,
        'label': 'Contrato',
        'route': '/contratos'
      },
      {
        'ids': ['connected_devices', 'CONNECTED_DEVICES', 'dispositivos', 'DISPOSITIVOS CONECTADOS'], 
        'icon': Icons.devices_other_rounded, 
        'label': 'Dispositivos', 
        'route': '/connected_devices'
      },
    ];

    return Consumer<AppProvider>(
      builder: (context, provider, child) {
        if (!provider.appConfigLoaded) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            provider.fetchAppConfig();
          });
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Acesso Rápido',
                style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              const Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ],
          );
        }

        final activeKeys = <String>{
          ...provider.activeShortcuts,
          ...provider.activeTools,
        };

        // Filter items based on active keys (case-insensitive check against valid IDs)
        final items = masterItems.where((item) {
          final ids = item['ids'] as List<String>;
          // Check if any of the item's IDs are present in the activeKeys set
          return ids.any((id) => activeKeys.contains(id) || activeKeys.contains(id.toUpperCase()) || activeKeys.contains(id.toLowerCase()));
        }).toList();

        if (items.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Acesso Rápido',
              style: TextStyle(color: textColor, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                mainAxisSpacing: 24,
                crossAxisSpacing: 16,
                childAspectRatio: 0.85,
              ),
              itemCount: items.length,
              itemBuilder: (context, index) {
                return Column(
                  children: [
                    Container(
                      width: 70,
                      height: 70,
                      decoration: BoxDecoration(
                        color: primaryRed,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: primaryRed.withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () {
                            final item = items[index];
                            if (item['label'] == 'Desbloqueio') {
                              final contractId = provider.userContract['id']?.toString() ?? 
                                              provider.userContract['contrato']?.toString() ?? '';
                              
                              if (contractId.isNotEmpty) {
                                _performUnlock(contractId);
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Erro: Contrato não identificado.'))
                                );
                              }
                            } else if (item['route'] != null) {
                              Navigator.of(context).pushNamed(item['route']);
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('${item['label']} em breve!'))
                              );
                            }
                          },
                          borderRadius: BorderRadius.circular(20),
                          child: Icon(items[index]['icon'], color: Colors.white, size: 32),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      items[index]['label'],
                      style: TextStyle(
                        color: textColor, // Garante contraste máximo (Preto no Claro, Branco no Escuro)
                        fontSize: 12, // Levemente reduzido para caber melhor 2 linhas
                        fontWeight: FontWeight.bold, // Negrito para evitar parecer "cinza/apagado"
                      ),
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                );
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildBottomNav(bool isDark) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24), // Margem para flutuar
      height: 75, // Altura reduzida (mais fino)
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E1E1E).withOpacity(0.95) : Colors.white.withOpacity(0.95), // Fundo semi-transparente
        borderRadius: BorderRadius.circular(40), // Bordas bem arredondadas (Pílula)
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2), // Sombra mais suave no light
            blurRadius: 20,
            offset: const Offset(0, 10),
            spreadRadius: 0,
          ),
        ],
        border: Border.all(
          color: isDark ? Colors.white.withOpacity(0.1) : Colors.black.withOpacity(0.05),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _buildNavItem(Icons.home_rounded, "Início", true, () {}),
          _buildNavItem(Icons.receipt_long_rounded, "Faturas", false, () => Navigator.of(context).pushNamed('/fatura')),
          const SizedBox(width: 60), // Espaço para o botão central
          _buildNavItem(Icons.headset_mic_rounded, "Suporte", false, () => Navigator.of(context).pushNamed('/support')),
          _buildNavItem(Icons.menu_rounded, "Menu", false, () => Navigator.of(context).pushNamed('/menu')),
        ],
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, bool isSelected, VoidCallback onTap) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final color = isSelected 
        ? const Color(0xFFFF0000) 
        : (isDark ? Colors.white : Colors.black); // Alto contraste para ícones não selecionados

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showMenuOptions() {
    // Implementação antiga, não utilizada mais pois temos a tela /menu
    // Mas mantida por compatibilidade caso seja chamada
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[700],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Menu',
                style: TextStyle(
                  color: isDark ? Colors.white : Colors.black,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.logout_rounded, color: Colors.red),
                ),
                title: const Text(
                  'Sair do App',
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                onTap: () async {
                  Navigator.pop(context); // Fecha o menu
                  await _handleLogout();
                },
              ),
              const SizedBox(height: 24),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleLogout() async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E1E1E) : Colors.white,
        title: Text('Sair', style: TextStyle(color: isDark ? Colors.white : Colors.black)),
        content: Text('Deseja realmente sair do aplicativo?', style: TextStyle(color: isDark ? Colors.white70 : Colors.grey[800])),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sair', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (!mounted) return;
      Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
    }
  }

  Widget _buildCentralButton() {
    final provider = Provider.of<AppProvider>(context);
    final status = provider.userContract['status'] ?? 'ATIVO';
    final isSuspended = status.toString().toUpperCase().contains('SUSPENSO');

    // Design "3D Grosso" High-End
    return Transform.translate(
      offset: const Offset(0, 20), // Ajuste fino da posição vertical (subindo um pouco)
      child: Container(
        width: 84,
        height: 94, // Altura extra para comportar a extrusão 3D sem cortar
        child: Stack(
          alignment: Alignment.bottomCenter,
          children: [
            // 1. Camada Base (Sombra e Espessura) - REMOVIDA
            /*
            Container(
              width: 76,
              height: 76,
              decoration: BoxDecoration(
                color: isSuspended ? const Color(0xFF4B0000) : const Color(0xFF144618),
                shape: BoxShape.circle,
                boxShadow: [],
              ),
            ),
            */
            
            // 2. Camada Face (O botão em si)
            Positioned(
              bottom: 0, // Encostado no fundo já que não tem base
              child: GestureDetector(
                onTap: () {
                  if (isSuspended) {
                    final contractId = provider.userContract['id']?.toString() ?? '';
                    if (contractId.isNotEmpty) {
                      _performUnlock(contractId);
                    } else {
                       ScaffoldMessenger.of(context).showSnackBar(
                         const SnackBar(content: Text('Erro: ID do contrato não encontrado.'))
                       );
                    }
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Recurso não disponível. Seu contrato está ativo.'),
                        backgroundColor: Colors.grey,
                        behavior: SnackBarBehavior.floating,
                        duration: Duration(seconds: 2),
                      )
                    );
                  }
                },
                child: Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    // Gradiente rico para dar volume à superfície
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isSuspended 
                        ? [const Color(0xFFEF5350), const Color(0xFFC62828)] // Vermelho se suspenso
                        : [const Color(0xFF66BB6A), const Color(0xFF2E7D32)], // Verde normal
                    ),
                    // Borda sutil para definição
                    border: Border.all(
                      color: Colors.white.withOpacity(0.15),
                      width: 1,
                    ),
                    boxShadow: [
                      // Highlight interno (Borda brilhante superior)
                      BoxShadow(
                        color: Colors.white.withOpacity(0.4),
                        blurRadius: 0,
                        offset: const Offset(0, 2), // Brilho "hard" no topo
                        spreadRadius: 0,
                      ),
                      // Sombra interna suave para arredondar
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                        spreadRadius: -2,
                      ),
                    ],
                  ),
                  child: Center(
                    child: Container(
                       // Círculo decorativo ao redor do ícone
                       width: 50,
                       height: 50,
                       decoration: BoxDecoration(
                         shape: BoxShape.circle,
                         color: Colors.black.withOpacity(0.1),
                         boxShadow: [
                           BoxShadow(
                             color: Colors.white.withOpacity(0.1),
                             blurRadius: 0,
                             offset: const Offset(0, 1),
                           )
                         ]
                       ),
                      child: Icon(
                        isSuspended ? Icons.lock_outline : Icons.lock_open_rounded,
                        color: Colors.white,
                        size: 28,
                        shadows: const [
                          Shadow(
                            color: Colors.black26,
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
