import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:device_info_plus/device_info_plus.dart';
import '../config.dart';

// Background handler must be top-level
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint("Handling a background message: ${message.messageId}");
}

class PushService {
  final String _apiBaseUrl = AppConfig.apiBaseUrl;
  final String _apiToken = AppConfig.apiToken;

  late final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _flutterLocalNotificationsPlugin = FlutterLocalNotificationsPlugin();
  
  String? _token;
  bool _isInitialized = false;
  
  final _messageStreamController = StreamController<Map<String, dynamic>>.broadcast();
  Stream<Map<String, dynamic>> get messageStream => _messageStreamController.stream;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Solicita permissão
      NotificationSettings settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('Permissão de notificação concedida');
        
        // 2. Configura notificações locais
        await _setupLocalNotifications();

        // 3. Obtém o token
        _token = await _firebaseMessaging.getToken();
        debugPrint('FCM Token: $_token');
        
        // 4. Listeners
        _firebaseMessaging.onTokenRefresh.listen((newToken) {
          _token = newToken;
          debugPrint('FCM Token atualizado: $_token');
        });
        
        // Background Handler
        FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

        // Foreground Handler
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('Mensagem recebida em primeiro plano: ${message.notification?.title}');
          
          _messageStreamController.add({
            'id': message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
            'title': message.notification?.title ?? 'Notificação',
            'message': message.notification?.body ?? '',
            'created_at': DateTime.now().toIso8601String(),
            'type': message.data['type'] ?? 'info',
            'read': false,
          });

          _showLocalNotification(message);
        });

        _isInitialized = true;
      } else {
        debugPrint('Permissão de notificação negada ou não determinada');
      }
    } catch (e) {
      debugPrint('Erro ao inicializar PushService: $e');
    }
  }

  Future<void> _setupLocalNotifications() async {
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('ic_notification');

    final DarwinInitializationSettings initializationSettingsIOS =
        DarwinInitializationSettings(
            requestAlertPermission: false,
            requestBadgePermission: false,
            requestSoundPermission: false);

    final InitializationSettings initializationSettings = InitializationSettings(
      android: initializationSettingsAndroid,
      iOS: initializationSettingsIOS,
    );

    await _flutterLocalNotificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse notificationResponse) {
        debugPrint('Notificação clicada: ${notificationResponse.payload}');
      },
    );

    // Create channel for Android
    if (Platform.isAndroid) {
      const AndroidNotificationChannel channel = AndroidNotificationChannel(
        'high_importance_channel', // id
        'High Importance Notifications', // title
        description: 'This channel is used for important notifications.', // description
        importance: Importance.max,
      );

      await _flutterLocalNotificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(channel);
    }
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    try {
      RemoteNotification? notification = message.notification;
      AndroidNotification? android = message.notification?.android;

      if (notification != null && android != null) {
        debugPrint('Exibindo notificação local: ${notification.title}');
        await _flutterLocalNotificationsPlugin.show(
          notification.hashCode,
          notification.title,
          notification.body,
          const NotificationDetails(
            android: AndroidNotificationDetails(
              'high_importance_channel',
              'High Importance Notifications',
              channelDescription: 'This channel is used for important notifications.',
              icon: 'ic_notification',
              largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
              importance: Importance.max,
              priority: Priority.high,
            ),
            iOS: DarwinNotificationDetails(
              presentAlert: true,
              presentBadge: true,
              presentSound: true,
            ),
          ),
          payload: jsonEncode(message.data),
        );
      } else {
        debugPrint('Notificação local ignorada: notification ou android null');
      }
    } catch (e) {
      debugPrint('Erro ao exibir notificação local: $e');
    }
  }

  String? get token => _token;

  Future<bool> registerDevice({String? cpf, String? contractId}) async {
    if (_token == null) {
      // Tenta pegar o token novamente se estiver nulo
      try {
        _token = await _firebaseMessaging.getToken();
      } catch (e) {
        debugPrint('Erro ao obter token FCM: $e');
      }
      
      if (_token == null) {
        debugPrint('Não é possível registrar dispositivo: Token nulo');
        return false;
      }
    }

    try {
      // Coletar informações do dispositivo
      String model = 'Unknown';
      String manufacturer = 'Unknown';
      String osVersion = 'Unknown';
      
      final deviceInfo = DeviceInfoPlugin();
      
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        model = androidInfo.model;
        manufacturer = androidInfo.manufacturer;
        osVersion = 'Android ${androidInfo.version.release} (SDK ${androidInfo.version.sdkInt})';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        model = iosInfo.utsname.machine;
        manufacturer = 'Apple';
        osVersion = 'iOS ${iosInfo.systemVersion}';
      }

      // Ajuste na URL para garantir que está correta
      String baseUrl = _apiBaseUrl;
      if (!baseUrl.endsWith('/')) {
        baseUrl += '/';
      }
      final url = Uri.parse('${baseUrl}devices/register/');
      
      final body = {
        'provider_token': _apiToken,
        'push_token': _token,
        'platform': Platform.isAndroid ? 'android' : 'ios',
        'cpf': cpf,
        'contract_id': contractId,
        'model': model,
        'manufacturer': manufacturer,
        'os_version': osVersion,
      };

      debugPrint('Registrando dispositivo no backend: $url');
      debugPrint('Payload: $body');

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        debugPrint('Dispositivo registrado com sucesso!');
        return true;
      } else {
        debugPrint('Falha ao registrar dispositivo: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      debugPrint('Erro ao registrar dispositivo no backend: $e');
      return false;
    }
  }
}
