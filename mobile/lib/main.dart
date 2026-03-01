import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'config.dart';

import 'provider.dart';
import 'services/push_service.dart';
import 'screens/home/home_screen.dart';
import 'screens/login/login_screen.dart';
import 'screens/fatura/fatura_screen.dart';
import 'screens/ai/ai_chat_screen.dart';
import 'screens/planos/planos_screen.dart';
import 'screens/perfil/perfil_screen.dart';
import 'screens/contratos/contratos_screen.dart';
import 'screens/consumption/consumption_screen.dart';
import 'screens/support/support_screen.dart';
import 'screens/modem/modem_info_screen.dart';
import 'screens/speed_test/speed_test_screen.dart';
import 'screens/connected_devices/connected_devices_screen.dart';
import 'screens/menu/menu_screen.dart';
import 'screens/menu/terms_screen.dart';
import 'screens/menu/privacy_screen.dart';
import 'screens/menu/select_contract_screen.dart';
import 'screens/notification/notification_screen.dart';
import 'screens/notification/notification_detail_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('pt_BR', null);

  // Configurações Globais
  try {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool('api_base_url_use_override') ?? false;
    final override = prefs.getString('api_base_url_override') ?? '';
    if (enabled && override.isNotEmpty) {
      AppConfig.setRuntimeApiBaseUrl(override);
    }
  } catch (e) {
    debugPrint("Erro ao carregar SharedPreferences: $e");
  }

  // Inicialização do Firebase (Robusta para White-Label)
  try {
    debugPrint("Iniciando Firebase...");
    await Firebase.initializeApp().timeout(const Duration(seconds: 8));
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
    debugPrint("Firebase inicializado com sucesso.");
  } catch (e) {
    debugPrint("⚠️ ALERTA: Erro ao inicializar Firebase: $e");
  }

  // Inicialização do Provider antes do App começar
  final AppProvider provider = AppProvider();
  await provider.initialize();
  
  // Opcional: inicializar push logo após
  try {
    await provider.initPushService();
  } catch (_) {}

  // Sincronização de Tempo
  try {
    await AppConfig.syncTime();
  } catch (_) {}

  runApp(
    ChangeNotifierProvider.value(
      value: provider,
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, provider, child) {
        return MaterialApp(
          title: 'JOCA NET',
          debugShowCheckedModeBanner: false,
          themeMode: provider.themeMode,
          // Configuração de Localização para PT-BR
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          supportedLocales: const [
            Locale('pt', 'BR'),
          ],
          locale: const Locale('pt', 'BR'),
          theme: ThemeData(
            brightness: Brightness.light,
            primaryColor: const Color(0xFF1A237E),
            scaffoldBackgroundColor: const Color(0xFFF5F5F5),
            useMaterial3: true,
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF1A237E),
              secondary: Color(0xFF00E5FF),
              background: Color(0xFFF5F5F5),
              surface: Colors.white,
              error: Color(0xFFB00020),
              onPrimary: Colors.white,
              onSecondary: Colors.black,
              onBackground: Colors.black,
              onSurface: Colors.black,
              onError: Colors.white,
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFF1A237E),
              foregroundColor: Colors.white,
            ),
          ),
          darkTheme: ThemeData(
            brightness: Brightness.dark,
            primaryColor: const Color(0xFF1A237E),
            scaffoldBackgroundColor: const Color(0xFF000000),
            useMaterial3: true,
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF1A237E),
              secondary: Color(0xFF00E5FF),
              background: Color(0xFF000000),
              surface: Color(0xFF111111),
              error: Color(0xFFCF6679),
              onPrimary: Colors.white,
              onSecondary: Colors.white,
              onBackground: Colors.white,
              onSurface: Colors.white,
              onError: Colors.black,
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFF1A237E),
              foregroundColor: Colors.white,
            ),
          ),
          // Decide a tela inicial aqui mesmo
          home: provider.isLoggedIn ? HomeScreen() : const LoginScreen(),
          routes: {
            '/login': (context) => const LoginScreen(),
            '/home': (context) => HomeScreen(),
            '/fatura': (context) => const FaturaScreen(),
            '/ai_chat': (context) => const AIChatScreen(),
            '/planos': (context) => const PlanosScreen(),
            '/perfil': (context) => const PerfilScreen(),
            '/contratos': (context) => const ContratosScreen(),
            '/consumo': (context) => ConsumptionScreen(),
            '/support': (context) => const SupportScreen(),
            '/wifi': (context) => const ModemInfoScreen(),
            '/speedtest': (context) => const SpeedTestScreen(),
            '/connected_devices': (context) => const ConnectedDevicesScreen(),
            '/menu': (context) => const MenuScreen(),
            '/select_contract': (context) => const SelectContractScreen(),
            '/terms': (context) => const TermsScreen(),
            '/privacy': (context) => const PrivacyScreen(),
            '/notifications': (context) => const NotificationScreen(),
            '/notification_detail': (context) => const NotificationDetailScreen(),
          },
        );
      },
    );
  }
}
