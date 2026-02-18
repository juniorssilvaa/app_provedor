/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Política de Privacidade - NANET TELECOM</title>
        <style>
            :root {
                --primary: #FF0000;
                --bg: #121212;
                --card: #1E1E1E;
                --text: #FFFFFF;
                --text-muted: #AAAAAA;
            }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: var(--bg);
                color: var(--text);
                line-height: 1.6;
                margin: 0;
                padding: 0;
            }
            .container {
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                border-bottom: 2px solid var(--primary);
                padding-bottom: 20px;
            }
            h1 { color: var(--text); margin: 0; font-size: 28px; }
            h2 { color: var(--primary); margin-top: 30px; font-size: 20px; border-left: 4px solid var(--primary); padding-left: 15px; }
            p, li { color: var(--text-muted); font-size: 16px; }
            .update-date { font-style: italic; color: var(--text-muted); font-size: 14px; }
            .card {
                background: var(--card);
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            ul { padding-left: 20px; }
            @media (max-width: 600px) {
                .container { margin: 20px; padding: 10px; }
                .card { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="header">
                    <h1>NANET TELECOM</h1>
                    <p>Política de Privacidade do Aplicativo</p>
                    <span class="update-date">Última atualização: 11 de Fevereiro de 2026</span>
                </div>

                <p>A <strong>NANET TELECOM</strong> valoriza a privacidade de seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações ao utilizar nosso aplicativo móvel.</p>

                <h2>1. Coleta de Dados</h2>
                <p>Para fornecer nossos serviços de forma eficiente, coletamos as seguintes informações:</p>
                <ul>
                    <li><strong>Dados Pessoais:</strong> Nome, CPF, endereço e informações de contato, conforme seu cadastro prévio em nosso sistema de provimento de internet.</li>
                    <li><strong>Dados do Dispositivo:</strong> Modelo do aparelho, versão do sistema operacional e identificadores únicos para envio de notificações e diagnóstico técnico.</li>
                    <li><strong>Dados de Rede e Wi-Fi:</strong> Status da conexão, SSID, informações básicas de sinal e consumo, necessários para as funções de gerenciamento de Wi-Fi.</li>
                    <li><strong>Localização:</strong> Devido às exigências do sistema Android para realizar buscas por redes Wi-Fi, o aplicativo pode solicitar permissão de localização. Não rastreamos seu deslocamento contínuo.</li>
                </ul>

                <h2>2. Uso das Informações</h2>
                <p>Utilizamos os dados coletados para as seguintes finalidades:</p>
                <ul>
                    <li>Autenticação segura de acesso ao painel do cliente;</li>
                    <li>Visualização e gerenciamento de faturas e boletos;</li>
                    <li>Prestação de suporte técnico e diagnóstico remoto de problemas de conexão;</li>
                    <li>Envio de notificações automáticas sobre prazos de pagamento, manutenções e alertas de serviço;</li>
                    <li>Facilitar o contato direto com nosso suporte via WhatsApp.</li>
                </ul>

                <h2>3. Compartilhamento de Dados</h2>
                <p>Seus dados são tratados com confidencialidade. Só compartilhamos informações com terceiros nos seguintes casos:</p>
                <ul>
                    <li><strong>Processadores de Pagamento:</strong> Para a emissão e compensação de boletos bancários;</li>
                    <li><strong>Obrigações Legais:</strong> Para cumprir ordens judiciais ou regulamentares, conforme o Marco Civil da Internet.</li>
                </ul>
                <p><em>Não vendemos nem alugamos seus dados pessoais para empresas de marketing.</em></p>

                <h2>4. Segurança da Informação</h2>
                <p>Implementamos rigorosos padrões de segurança, incluindo:</p>
                <ul>
                  <li>Criptografia de ponta a ponta em todas as comunicações com nossos servidores;</li>
                  <li>Protocolos de segurança em nosso banco de dados;</li>
                  <li>Acesso restrito a informações sensíveis por nossa equipe técnica.</li>
                </ul>

                <h2>5. Retenção e Exclusão</h2>
                <p>Seus dados são mantidos enquanto você possuir um contrato ativo conosco. Caso deseje a exclusão de sua conta no app ou dos dados coletados através dele, você pode solicitar via suporte técnico ou diretamente nas configurações do perfil (quando disponível).</p>

                <h2>6. Contato</h2>
                <p>Para dúvidas sobre nossa política de privacidade, entre em contato através do nosso canal de suporte: <strong>+55 81 8233-7720</strong></p>
                
                <hr style="border: 0; border-top: 1px solid #333; margin-top: 40px;">
                <p style="text-align: center; font-size: 12px;">© 2026 NANET TELECOM. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
    });
  }
};
