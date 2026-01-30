const axios = require('axios');

const config = {
  sgpBaseUrl: 'https://asnet.sgplocal.com.br',
  sgpApp: 'asnetchat',
  sgpToken: '62d9d76f-2f00-4814-aaf1-f57317bf31bd',
};

async function testApi() {
  const cpfCnpj = '00000000000'; // Um CPF inválido para testar a resposta
  
  console.log('Testando endpoint de títulos...');
  try {
    const response = await axios.post(`${config.sgpBaseUrl}/api/ura/titulos/`, {
      token: config.sgpToken,
      app: config.sgpApp,
      cpfcnpj: cpfCnpj,
    });
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.log('Erro Status:', error.response.status);
      console.log('Erro Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Erro:', error.message);
    }
  }
}

testApi();
