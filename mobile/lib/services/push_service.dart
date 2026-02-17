import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:device_info_plus/device_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';
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

  Future<Map<String, dynamic>> _collectDeviceInfo() async {
    final deviceInfo = DeviceInfoPlugin();
    if (Platform.isAndroid) {
      final android = await deviceInfo.androidInfo;
      return {
        'platform': 'android',
        'model': android.model,
        'model_name': android.model,
        'manufacturer': android.manufacturer,
        'brand': android.brand,
        'device': android.device,
        'product': android.product,
        'hardware': android.hardware,
        'android_version': android.version.release,
        'device_version': android.version.release,
        'model_version': android.device, // best-effort: codename/sku-like
        'sdk': android.version.sdkInt,
        'base_os': android.version.baseOS,
        'codename': android.version.codename,
        'incremental': android.version.incremental,
        'security_patch': android.version.securityPatch,
        'fingerprint': android.fingerprint,
        'is_emulator': !(android.isPhysicalDevice ?? true),
        // Campos redundantes para compatibilidade com backend
        'os_version': 'Android ${android.version.release} (SDK ${android.version.sdkInt})',
        'device_model': android.model,
        'os': 'android',
      };
    } else if (Platform.isIOS) {
      final ios = await deviceInfo.iosInfo;
      return {
        'platform': 'ios',
        'model': ios.utsname.machine,
        'model_name': ios.utsname.machine,
        'manufacturer': 'Apple',
        'brand': 'Apple',
        'system_name': 'iOS',
        'system_version': ios.systemVersion,
        'device_version': ios.systemVersion,
        'model_version': ios.utsname.machine,
        'is_emulator': !(ios.isPhysicalDevice ?? true),
        'os_version': 'iOS ${ios.systemVersion}',
        'device_model': ios.utsname.machine,
        'os': 'ios',
      };
    }
    return {
      'platform': Platform.operatingSystem,
      'os_version': Platform.operatingSystemVersion,
    };
  }

  Future<Map<String, dynamic>> _collectPermissions() async {
    final Map<String, dynamic> perms = {};
    Future<String> statusOf(Permission p) async {
      final s = await p.status;
      if (s.isGranted) return 'granted';
      if (s.isDenied) return 'denied';
      if (s.isPermanentlyDenied) return 'permanently_denied';
      if (s.isRestricted) return 'restricted';
      if (s.isLimited) return 'limited';
      return s.name;
    }
    try {
      perms['notification'] = await statusOf(Permission.notification);
    } catch (_) {}
    try {
      perms['location'] = await statusOf(Permission.location);
      perms['location_when_in_use'] = await statusOf(Permission.locationWhenInUse);
    } catch (_) {}
    try {
      perms['storage'] = await statusOf(Permission.storage);
    } catch (_) {}
    return perms;
  }

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
      final device = await _collectDeviceInfo();
      final permissions = await _collectPermissions();

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
        // Campos diretos (antigos)
        'model': device['model'],
        'manufacturer': device['manufacturer'],
        'os_version': device['os_version'],
        'device_version': device['device_version'],
        // Campos estendidos para compatibilidade
        'os': device['os'],
        'android_version': device['android_version'],
        'sdk': device['sdk'],
        'brand': device['brand'],
        'device_model': device['device_model'] ?? device['model'],
        'model_name': device['model_name'] ?? device['model'],
        'model_version': device['model_version'] ?? device['device'],
        'fingerprint': device['fingerprint'],
        'base_os': device['base_os'],
        'codename': device['codename'],
        'incremental': device['incremental'],
        // Sinônimos em PT/variações comuns para compatibilidade com o backend
        'sistema_operacional': device['os'] ?? 'android',
        'versao_sistema': device['os_version'],
        'versao': device['android_version'] ?? device['os_version'],
        'versao_android': device['android_version'],
        'sdk_version': device['sdk'],
        'android_sdk': device['sdk'],
        'modelo': device['model'],
        'modelo_dispositivo': device['device_model'] ?? device['model'],
        'versao_dispositivo': device['device_version'],
        'fabricante': device['manufacturer'],
        'marca': device['brand'] ?? device['manufacturer'],
        // Estruturas detalhadas
        'device_info': device,
        'permissions': permissions,
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
