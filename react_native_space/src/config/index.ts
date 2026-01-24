/** URL base da API em desenvolvimento (Android emulador: 10.0.2.2, iOS: localhost) */
const DEV_API_URL = 'http://10.0.2.2:8000/api/';

/** URL base da API em produção */
const PROD_API_URL = 'https://apis.niochat.com.br/api/';

/** Token do provedor. Definir EXPO_PUBLIC_API_TOKEN no .env (não commitar). */
const API_TOKEN = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_TOKEN
  ? process.env.EXPO_PUBLIC_API_TOKEN
  : '';

export const config = {
  // Backend Niochat: o app se identifica pelo apiToken; o backend resolve URL e token SGP do provedor.
  apiBaseUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,

  providerId: 2,
  apiToken: API_TOKEN,

  clientName: 'NANET',
  primaryColor: '#E60000',
};
