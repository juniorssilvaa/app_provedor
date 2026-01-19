export const config = {
  // Configuração do Backend Niochat (Dinamismo Total)
  // O app agora se identifica apenas pelo apiToken. 
  // O Backend resolve a URL e o Token do SGP específicos de cada provedor via Proxy.
  
  // URL da API de Produção
  apiBaseUrl: 'https://apis.niochat.com.br/api/', 
  
  // Token de integração gerado no painel do provedor
  // Este token identifica o provedor NIONET
  // TODO: Mover para variável de ambiente ou configurar via CI/CD
  apiToken: '', // Token de integração (gerado no painel) - Substitua pelo valor real ou use variáveis de ambiente
  
  // Customização Visual (Fallback)
  clientName: 'NIONET',
  primaryColor: '#3b82f6',
};
