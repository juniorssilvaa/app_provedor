/** URL base da API em desenvolvimento.
 * Emulador Android: 10.0.2.2:8000. Celular na mesma Wi‑Fi: use EXPO_PUBLIC_DEV_API_URL=http://<IP_DO_PC>:8000/api/
 */
const DEV_API_URL = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_API_URL
  ? process.env.EXPO_PUBLIC_DEV_API_URL
  : 'http://10.0.2.2:8000/api/';

/** URL base da API em produção */
const PROD_API_URL = 'https://apis.niochat.com.br/api/';

export const config = {
  // Backend Niochat: o app se identifica pelo apiToken; o backend resolve URL e token SGP do provedor.
  apiBaseUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,
  providerId: 1,
  apiToken: 'sk_live_' + '274423e0ffc0834655177e693e07a1b1682dafca75a3fd17',
  clientName: (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_CLIENT_NAME) || 'NANET',
  primaryColor: '#E60000',
  /** Número de contato do provedor (WhatsApp/tel). Ex.: +558182337720 → 558182337720 */
  providerPhone: '558182337720',
};
