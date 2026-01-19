const axios = require('axios');
const FormData = require('form-data'); // Axios usually requires 'form-data' package for multipart in Node

const config = {
  sgpBaseUrl: 'https://asnet.sgplocal.com.br',
  sgpApp: 'asnetchat',
  sgpToken: '62d9d76f-2f00-4814-aaf1-f57317bf31bd',
};

const api = axios.create({
  baseURL: config.sgpBaseUrl,
  timeout: 10000,
});

async function consultaCliente(cpfCnpj) {
  try {
    console.log(`[TEST] Consultando cliente: ${cpfCnpj}`);
    console.log(`[TEST] URL: ${config.sgpBaseUrl}/api/ura/consultacliente/`);

    // consultaCliente uses JSON
    const response = await api.post('/api/ura/consultacliente/', {
      token: config.sgpToken,
      app: config.sgpApp,
      cpfcnpj: cpfCnpj,
    });

    console.log('[TEST] Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.contratos) {
      console.log(`[TEST] Cliente encontrado: ${response.data.nome}`);
      console.log(`[TEST] Contratos encontrados: ${response.data.contratos.length}`);
      return response.data;
    } else {
      console.log('[TEST] Cliente não encontrado ou sem contratos.');
      return null;
    }
  } catch (error) {
    console.error('[TEST] Erro ao consultar cliente:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function consultarCpe(contratoId) {
  try {
    console.log(`[TEST] Consultando CPE para contrato: ${contratoId}`);
    const form = new FormData();
    form.append('token', config.sgpToken);
    form.append('app', config.sgpApp);
    form.append('contrato', contratoId);
    form.append('wifi_status', '1'); // Trying to get status

    const response = await api.post('/api/ura/cpemanage/', form, {
      headers: { ...form.getHeaders() },
    });

    console.log('[TEST] Resposta CPE:', JSON.stringify(response.data, null, 2));
    
    // Check if client data updated
    console.log('[TEST] Verificando se dados do cliente atualizaram...');
    const updatedClient = await consultaCliente('03169892231');
    if (updatedClient && updatedClient.contratos[0]) {
        const c = updatedClient.contratos[0];
        console.log('[TEST] Dados Wifi do contrato:', {
            ssid: c.servico_wifi_ssid,
            pass: c.servico_wifi_password,
            ssid5: c.servico_wifi_ssid_5,
            pass5: c.servico_wifi_password_5
        });
    }

    return response.data;
  } catch (error) {
    console.error('[TEST] Erro ao consultar CPE:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

async function run() {
  const targetCpf = '03169892231';
  
  const clientData = await consultaCliente(targetCpf);
  
  if (clientData && clientData.contratos && clientData.contratos.length > 0) {
    // Try for the first contract
    const firstContract = clientData.contratos[0];
    const contractId = firstContract.contratoId; // Fixed: property is contratoId, not contrato
    
    console.log(`[TEST] Usando contrato ID: ${contractId}`);
    await consultarCpe(contractId);
  } else {
    console.log('[TEST] Não foi possível prosseguir com o teste de CPE.');
  }
}

run();
