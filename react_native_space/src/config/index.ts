export const config = {
  // Configuração do Backend Niochat (Dinamismo Total)
  // O app agora se identifica apenas pelo apiToken. 
  // O Backend resolve a URL e o Token do SGP específicos de cada provedor.
  
  // Se estiver testando localmente (NoxPlayer/Emulador), use http://192.168.3.22:8000/api/
  // Se estiver em produção, use https://apis.niochat.com.br/api/
  apiBaseUrl: 'https://apis.niochat.com.br/api/', 
  
  providerId: 1, // ID do provedor NANET
  apiToken: 'sk_live_' + '274423e0ffc0834655177e693e07a1b1682dafca75a3fd17', // Token de integração do provedor NANET
  
  // Customização Visual do App (Estes dados também podem ser carregados dinamicamente via /api/public/config/)
  clientName: 'NANET',
  primaryColor: '#3b82f6',
};
