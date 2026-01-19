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
  let token;

  const isStandaloneApp = Constants.appOwnership === 'standalone';

  // Evita chamar APIs nativas de push em Expo Go / Dev Client (Android),
  // onde o push FCM direto não é suportado.
  if (!isStandaloneApp) {
    console.log(
      '[Push] Registro de token FCM ignorado (app não está em modo standalone).'
    );
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
        console.log("Native FCM Token:", token);
    } catch (e) {
        console.error("Error getting push token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
