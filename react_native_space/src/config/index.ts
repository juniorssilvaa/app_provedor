export const config = {
  // Configuração do Backend Niochat (Dinamismo Total)
  // O app agora se identifica apenas pelo apiToken. 
  // O Backend resolve a URL e o Token do SGP específicos de cada provedor.
  
  // Se estiver testando localmente (NoxPlayer/Emulador), use http://10.0.2.2:8000/api/
  // Se estiver em produção, use https://apis.niochat.com.br/api/
  apiBaseUrl: 'https://apis.niochat.com.br/api/', 
  
  providerId: 1, // Referência interna
  apiToken: 'YOUR_API_TOKEN_HERE', // Token de integração (gerado no painel) - Substitua pelo valor real ou use variáveis de ambiente
  
  // Customização Visual do App (Estes dados também podem ser carregados dinamicamente via /api/public/config/)
  clientName: 'R7 Fibra',
  primaryColor: '#3b82f6',
};
