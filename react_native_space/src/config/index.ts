export const config = {
  // Configuração do Backend Niochat (Dinamismo Total)
  // O app agora se identifica apenas pelo apiToken. 
  // O Backend resolve a URL e o Token do SGP específicos de cada provedor.
  
  // Se estiver testando localmente (NoxPlayer/Emulador), use o IP real da máquina (192.168.100.55) ou http://10.0.2.2:8000/api/
  // Se estiver em produção, use https://apis.niochat.com.br/api/
  apiBaseUrl: 'https://apis.niochat.com.br/api/', // URL de produção 
  
  providerId: 2, // ID do provedor NANET
  apiToken: 'sk_live_' + '274423e0ffc0834655177e693e07a1b1682dafca75a3fd17', // Token de integração do provedor NANET
  
  // Customização Visual do App (Estes dados também podem ser carregados dinamicamente via /api/public/config/)
  clientName: 'NANET',
  primaryColor: '#E60000', // Vermelho da logo NANET
};
