export const config = {
  // Configuração do Backend Niochat (Dinamismo Total)
  // O app agora se identifica apenas pelo apiToken. 
  // O Backend resolve a URL e o Token do SGP específicos de cada provedor.
  
  // Se estiver testando localmente (NoxPlayer/Emulador), use http://192.168.3.22:8000/api/
  // Se estiver em produção, use https://apis.niochat.com.br/api/
  apiBaseUrl: 'https://apis.niochat.com.br/api/', 
  
  providerId: 1, // ID do provedor NANET
  apiToken: 'TOKEN_INTEGRACAO_PROVEDOR', // Token de integração do provedor NANET (Substitua pelo valor real ou use variáveis de ambiente)
  
  // Customização Visual do App (Estes dados também podem ser carregados dinamicamente via /api/public/config/)
  clientName: 'NANET',
  primaryColor: '#3b82f6',
};
