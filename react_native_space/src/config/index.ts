/** URL base da API em desenvolvimento (Android emulador: 10.0.2.2, iOS: localhost) */
const DEV_API_URL = 'http://10.0.2.2:8000/api/';

/** URL base da API em produção */
const PROD_API_URL = 'https://apis.niochat.com.br/api/';

export const config = {
  // Backend Niochat: o app se identifica pelo apiToken; o backend resolve URL e token SGP do provedor.
  apiBaseUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,
  providerId: 1,
  apiToken: 'sk_live_' + '274423e0ffc0834655177e693e07a1b1682dafca75a3fd17',
  clientName: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CLIENT_NAME) || 'NANET',
  primaryColor: '#E60000',
};
