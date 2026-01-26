/** URL base da API em desenvolvimento.
 * Emulador Android: 10.0.2.2:8000. 
 * Celular na mesma Wi‑Fi: use EXPO_PUBLIC_DEV_API_URL=http://<IP_DO_PC>:8000/api/
 * IPs do provedor:
 *   - 72.14.201.202:8000 (IP do bloco do provedor)
 *   - 100.64.38.78:8000 (IP do roteador - CGNAT)
 */
const DEV_API_URL = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_DEV_API_URL
  ? process.env.EXPO_PUBLIC_DEV_API_URL
  : 'http://10.0.2.2:8000/api/';

/** IPs permitidos do provedor para conexão direta */
export const PROVIDER_IPS = {
  providerBlock: '72.14.201.202',
  routerIP: '100.64.38.78',
  cgnatRange: '100.64.0.0/10', // Range CGNAT completo
};

/** Helper para construir URL da API com IP do provedor */
export const getProviderApiUrl = (ip: string, port: number = 8000): string => {
  return `http://${ip}:${port}/api/`;
};

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
