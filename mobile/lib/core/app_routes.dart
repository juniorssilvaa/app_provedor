import 'package:flutter/material.dart';
import '../screens/home/home_screen.dart';
import '../screens/login/login_screen.dart';
import '../screens/fatura/fatura_screen.dart';
import '../screens/ai/ai_chat_screen.dart';
import '../screens/planos/planos_screen.dart';
import '../screens/perfil/perfil_screen.dart';
import '../screens/contratos/contratos_screen.dart';
import '../screens/consumption/consumption_screen.dart';
import '../screens/support/support_screen.dart';
import '../screens/modem/modem_info_screen.dart';
import '../screens/speed_test/speed_test_screen.dart';
import '../screens/connected_devices/connected_devices_screen.dart';
import '../screens/menu/menu_screen.dart';
import '../screens/menu/terms_screen.dart';
import '../screens/menu/privacy_screen.dart';
import '../screens/menu/select_contract_screen.dart';
import '../screens/notification/notification_screen.dart';
import '../screens/notification/notification_detail_screen.dart';

class AppRoutes {
  static const String login = '/login';
  static const String home = '/home';
  static const String fatura = '/fatura';
  static const String aiChat = '/ai_chat';
  static const String planos = '/planos';
  static const String perfil = '/perfil';
  static const String contratos = '/contratos';
  static const String consumo = '/consumo';
  static const String support = '/support';
  static const String wifi = '/wifi';
  static const String speedtest = '/speedtest';
  static const String connectedDevices = '/connected_devices';
  static const String menu = '/menu';
  static const String selectContract = '/select_contract';
  static const String terms = '/terms';
  static const String privacy = '/privacy';
  static const String notifications = '/notifications';
  static const String notificationDetail = '/notification_detail';

  static Map<String, WidgetBuilder> get routes => {
    login: (context) => const LoginScreen(),
    home: (context) => HomeScreen(),
    fatura: (context) => const FaturaScreen(),
    aiChat: (context) => const AIChatScreen(),
    planos: (context) => const PlanosScreen(),
    perfil: (context) => const PerfilScreen(),
    contratos: (context) => const ContratosScreen(),
    consumo: (context) => ConsumptionScreen(),
    support: (context) => const SupportScreen(),
    wifi: (context) => const ModemInfoScreen(),
    speedtest: (context) => const SpeedTestScreen(),
    connectedDevices: (context) => const ConnectedDevicesScreen(),
    menu: (context) => const MenuScreen(),
    selectContract: (context) => const SelectContractScreen(),
    terms: (context) => const TermsScreen(),
    privacy: (context) => const PrivacyScreen(),
    notifications: (context) => const NotificationScreen(),
    notificationDetail: (context) => const NotificationDetailScreen(),
  };
}
