import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'dart:convert'; // Para Base64Decode
import '../../provider.dart';

class AIChatScreen extends StatefulWidget {
  const AIChatScreen({super.key});

  @override
  State<AIChatScreen> createState() => _AIChatScreenState();
}

class _AIChatScreenState extends State<AIChatScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isLoading = false;
  
  final Color primaryRed = const Color(0xFFFF0000);
  final Color cardBg = const Color(0xFF111111);
  String? _sessionId;

  @override
  void initState() {
    super.initState();
    
    // Recupera o nome do usuário do Provider para personalizar a saudação
    final provider = context.read<AppProvider>();
    String greeting = 'Olá';
    
    if (provider.userName != null && provider.userName!.isNotEmpty) {
      // Pega apenas o primeiro nome para ser mais amigável
      final firstName = provider.userName!.split(' ')[0];
      greeting = 'Olá, $firstName';
    }

    // Mensagem de boas-vindas inicial
    _messages.add(ChatMessage(
      role: 'assistant',
      content: '$greeting! Sou seu assistente Nanet. Como posso ajudar com sua conexão ou faturas hoje?',
      timestamp: DateTime.now(),
    ));
    
    // Coletar telemetria ao abrir o chat se necessário
    WidgetsBinding.instance.addPostFrameCallback((_) => _collectInitialTelemetry());
  }

  Future<void> _collectInitialTelemetry() async {
    final provider = context.read<AppProvider>();
    await provider.telemetryService.collectTelemetry();
  }

  @override
  void dispose() {
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    final messageText = _messageController.text.trim();
    if (messageText.isEmpty) return;

    final provider = context.read<AppProvider>();
    
    setState(() {
      _messages.add(ChatMessage(
        role: 'user',
        content: messageText,
        timestamp: DateTime.now(),
      ));
      _isLoading = true;
      _messageController.clear();
    });

    _scrollToBottom();

    try {
      // Coletar telemetria se a mensagem parecer técnica
      Map<String, dynamic>? telemetry;
      if (messageText.toLowerCase().contains('analis') || messageText.toLowerCase().contains('lento')) {
        telemetry = await provider.telemetryService.collectTelemetry();
      }

      final response = await provider.aiService?.sendMessage(
        message: messageText,
        cpf: provider.cpf ?? '',
        sessionId: _sessionId,
        name: provider.userName,
        telemetry: telemetry,
      );

      if (response != null) {
        if (response.containsKey('session_id')) {
          _sessionId = response['session_id'].toString();
        }

        // Verifica se há uma lista de mensagens estruturadas
        if (response.containsKey('messages') && response['messages'] is List && (response['messages'] as List).isNotEmpty) {
           final messagesList = response['messages'] as List;
           
           for (var msg in messagesList) {
             // Delay simulado para parecer digitação/fluxo natural
             await Future.delayed(const Duration(milliseconds: 1500));
             
             String content = '';
             Map<String, dynamic>? msgPaymentData;

             if (msg is String) {
               content = msg;
               // Se for a última mensagem e tiver payment_data global, anexa
               if (msg == messagesList.last && response.containsKey('payment_data')) {
                 msgPaymentData = response['payment_data'];
               }
             } else if (msg is Map) {
               content = msg['text'] ?? '';
               msgPaymentData = msg['payment_data'];
             }

             if (content.isNotEmpty) {
                setState(() {
                  _messages.add(ChatMessage(
                    role: 'assistant',
                    content: content,
                    timestamp: DateTime.now(),
                    paymentData: msgPaymentData,
                  ));
                });
                _scrollToBottom();
             }
           }
        } else if (response.containsKey('response')) {
          setState(() {
            _messages.add(ChatMessage(
              role: 'assistant',
              content: response['response'],
              timestamp: DateTime.now(),
              paymentData: response['payment_data'],
            ));
          });
        } else {
          setState(() {
            _messages.add(ChatMessage(
              role: 'assistant',
              content: 'Desculpe, não consegui processar sua solicitação agora.',
              timestamp: DateTime.now(),
            ));
          });
        }
      } else {
        setState(() {
          _messages.add(ChatMessage(
            role: 'assistant',
            content: 'Desculpe, não consegui processar sua solicitação agora.',
            timestamp: DateTime.now(),
          ));
        });
      }
    } catch (e) {
      setState(() {
        _messages.add(ChatMessage(
          role: 'assistant',
          content: 'Erro de conexão. Tente novamente mais tarde.',
          timestamp: DateTime.now(),
        ));
      });
    } finally {
      setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: primaryRed,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text('Assistente Nanet', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                return _buildMessageBubble(_messages[index]);
              },
            ),
          ),
          if (_isLoading)
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: LinearProgressIndicator(color: primaryRed, backgroundColor: Colors.white10),
            ),
          _buildInputArea(),
        ],
      ),
    );
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(30),
                border: Border.all(color: Colors.white10),
              ),
              child: TextField(
                controller: _messageController,
                maxLines: null,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(
                  hintText: 'Como posso ajudar?',
                  hintStyle: TextStyle(color: Colors.grey),
                  border: InputBorder.none,
                ),
                onSubmitted: (_) => _sendMessage(),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _sendMessage,
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(color: primaryRed, shape: BoxShape.circle),
              child: const Icon(Icons.send, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final bool isUser = message.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!isUser) _buildAssistantIcon(),
              const SizedBox(width: 8),
              Flexible(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isUser ? primaryRed : cardBg,
                    borderRadius: BorderRadius.circular(20).copyWith(
                      bottomLeft: isUser ? null : const Radius.circular(0),
                      bottomRight: isUser ? const Radius.circular(0) : null,
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.content,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                      ),
                      if (message.paymentData != null) _buildPaymentCard(message.paymentData!),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAssistantIcon() {
    return Container(
      width: 40,
      height: 40,
      decoration: const BoxDecoration(color: Color(0xFF222222), shape: BoxShape.circle),
      child: Icon(Icons.smart_toy, color: primaryRed, size: 24),
    );
  }

  Widget _buildPaymentCard(Map<String, dynamic> data) {
    final String? pixCode = data['pix_code'] ?? data['pix_copia_e_cola'] ?? data['codigoPix'];
    final String? barcode = data['barcode'] ?? data['linha_digitavel'] ?? data['linhaDigitavel'];
    final String? qrCodeBase64 = data['qrcode_base64'];

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E), // Fundo escuro conforme imagem
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          const Text(
            'Opções de Pagamento',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'PIX - COPIA E COLA',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 16),
          if (pixCode != null && pixCode.isNotEmpty) ...[
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.all(16), // Margem segura
              child: qrCodeBase64 != null
                  ? Image.memory(
                      base64Decode(qrCodeBase64),
                      width: 220.0,
                      height: 220.0,
                      fit: BoxFit.contain,
                    )
                  : QrImageView(
                      data: pixCode,
                      version: QrVersions.auto,
                      size: 220.0,
                      backgroundColor: Colors.white,
                      errorCorrectionLevel: QrErrorCorrectLevel.M,
                      gapless: true,
                    ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: pixCode));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chave PIX copiada!')));
                },
                icon: SvgPicture.asset(
                  'assets/pix-svgrepo-com.svg', 
                  width: 24, 
                  height: 24,
                  colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                ),
                label: const Text('Copiar Chave Pix'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                ),
              ),
            ),
          ],
          if (barcode != null && barcode.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: barcode));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Código de Barras copiado!')));
                },
                icon: SvgPicture.asset(
                  'assets/barcode-svgrepo-com.svg', 
                  width: 24, 
                  height: 24,
                  colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
                ),
                label: const Text('Copiar Código de Barras'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class ChatMessage {
  final String role;
  final String content;
  final DateTime timestamp;
  final Map<String, dynamic>? paymentData;

  ChatMessage({
    required this.role,
    required this.content,
    required this.timestamp,
    this.paymentData,
  });
}
