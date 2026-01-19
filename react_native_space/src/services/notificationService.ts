import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true, // Ativado para mostrar badge no ícone do app
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token: string | undefined;

  const isStandaloneApp = Constants.executionEnvironment === 'standalone' || Constants.executionEnvironment === 'bare';

  // Evita chamar APIs nativas de push em Expo Go / Dev Client (Android),
  // onde o push FCM direto não é suportado.
  if (!isStandaloneApp) {
    console.log(
      '[Push] Registro de token FCM ignorado (app não está em modo standalone/bare).'
    );
    // Para testes locais (Expo Go), retornamos undefined ou um token dummy se necessário
    return;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Get the token that uniquely identifies this device (Native FCM Token)
    try {
        // Mudança para pegar o token nativo do dispositivo (FCM) ao invés do Expo Token
        const tokenData = await Notifications.getDevicePushTokenAsync();
        token = tokenData.data;
        console.log("Native FCM Token Success:", token);
    } catch (e) {
        console.error("Error getting push token:", e);
        // Fallback: Tenta pegar o Expo Push Token se o nativo falhar (embora o backend espere FCM)
        try {
             const expoToken = await Notifications.getExpoPushTokenAsync();
             console.log("Fallback Expo Token:", expoToken.data);
             // Não usamos o expo token por padrão, mas serve para debug
        } catch (e2) {
             console.error("Error getting fallback expo token:", e2);
        }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
