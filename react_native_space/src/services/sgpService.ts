import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { SGPClientResponse, User, Contract, Plan, ServiceAccess, SGPVerificaAcessoResponse, SGPTitulosResponse, Invoice, SGPCpeResponse, SGPLiberacaoPromessaResponse, SGPChamado, SGPCriarChamadoResponse, SGPTipoOcorrencia } from '../types';

class SGPService {
  private api: AxiosInstance | null = null;
  private publicApi: AxiosInstance;
  private sgpCredentials: { url: string; token: string; app: string } | null = null;

  constructor() {
    // Remove barra final da apiBaseUrl se existir para evitar "//"
    const base = config.apiBaseUrl.endsWith('/') 
      ? config.apiBaseUrl.slice(0, -1) 
      : config.apiBaseUrl;

    this.publicApi = axios.create({
      baseURL: base, // Base da API (ex: https://apis.niochat.com.br/api)
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
  }

  /**
   * Configura as credenciais do SGP para uso direto
   */
  setSGPCredentials(url: string, token: string, app: string) {
    this.sgpCredentials = { url, token, app };
    
    // Remove barra final da URL se existir
    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    
    this.api = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
    
    console.log('[SGP] Credenciais configuradas:', { url: baseUrl, token: token.substring(0, 10) + '...', app });
  }

  /**
   * Retorna a instância da API (SGP direto ou proxy)
   */
  private getApi(): AxiosInstance {
    if (this.api) {
      return this.api;
    }
    
    // Fallback para proxy se não houver credenciais
    const base = config.apiBaseUrl.endsWith('/') 
      ? config.apiBaseUrl.slice(0, -1) 
      : config.apiBaseUrl;
    
    this.api = axios.create({
      baseURL: `${base}/sgp/`,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    return this.api;
  }

  /**
   * Helper para construir payload com token e app do SGP
   */
  private getSGPPayload(extra: any = {}) {
    if (this.sgpCredentials) {
      return {
        token: this.sgpCredentials.token,
        app: this.sgpCredentials.app,
        ...extra
      };
    }
    
    // Fallback para proxy
    return {
      provider_token: config.apiToken,
      ...extra
    };
  }

  /**
   * Consulta faturas por CPF/CNPJ
   */
  async consultaFaturas(cpfCnpj: string): Promise<Invoice[]> {
    try {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      console.log('[SGP] Consultando faturas para:', cleanCpfCnpj);
      
      const response = await this.getApi().post<SGPTitulosResponse>('api/ura/titulos/', this.getSGPPayload({
        cpfcnpj: cleanCpfCnpj,
      }));

      // SGP pode retornar em 'titulos' ou 'links' dependendo da versão/endpoint
      const rawInvoices = response.data?.titulos || (response.data as any)?.links || [];
      return this.mapInvoices(rawInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  private mapInvoices(rawInvoices: any[], defaultContractId?: string): Invoice[] {
    if (!rawInvoices || !Array.isArray(rawInvoices)) return [];

    console.log('[SGP] mapInvoices recebeu:', JSON.stringify(rawInvoices, null, 2));

    return rawInvoices.map((t: any) => {
      let status: 'paid' | 'pending' | 'overdue' = 'pending';

      const rawStatus = (t.status || t.status_display || '').toLowerCase();

      if (rawStatus.includes('pago') || rawStatus.includes('liquidado')) {
        status = 'paid';
      } else if (rawStatus.includes('vencido') || rawStatus.includes('atrasado')) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      // Captura da chave PIX (Múltiplas fontes possíveis)
      // Prioridade: codigopix direto (como vem da API SGP em links)
      console.log('[SGP] mapInvoices - Item fatura recebido:', { id: t.id || t.fatura, codigopix: t.codigopix, codigoPix: t.codigoPix });
      
      const pixKeyRaw =
        t.codigopix ||  // Primeiro tenta codigopix direto (minúscula como vem da API SGP)
        t.codigoPix ||  // Depois codigoPix (maiúscula)
        (Array.isArray(t.links) && t.links.length > 0 ? (t.links[0].codigopix || t.links[0].codigoPix || '') : '') || // Dentro de links[0] se existir
        t.pix_qrcode || 
        t.pix_copia_cola || 
        t.pix_copiaecola || 
        t.pix_code || 
        '';
      
      const pixKey = typeof pixKeyRaw === 'string' ? pixKeyRaw.trim() : '';
      console.log('[SGP] mapInvoices - Chave PIX extraída:', pixKey ? 'ENCONTRADA' : 'NÃO ENCONTRADA', pixKey ? pixKey.substring(0, 20) + '...' : '');

      return {
        id: (t.id || t.fatura || '').toString(),
        contractId: (t.clienteContrato || t.contrato || defaultContractId || '').toString(),
        description: t.demonstrativo || 'Fatura Mensal',
        dueDate: t.dataVencimento || t.vencimento || t.vencimento_original || '',
        amount: t.valor || t.valor_original || 0,
        status: status,
        link: t.link ? t.link.trim() : '',
        linkCobranca: t.link_cobranca ? t.link_cobranca.trim() : '',
        linhaDigitavel: (
          t.linhadigitavel ||  // Primeiro tenta linhadigitavel direto (minúscula como vem da API SGP)
          t.linhaDigitavel || 
          t.linha_digitavel || 
          (Array.isArray(t.links) && t.links.length > 0 ? (t.links[0].linhadigitavel || t.links[0].linhaDigitavel || '') : '') || // Dentro de links[0] se existir
          ''
        ),
        codigoPix: pixKey,
        codigopix: pixKey,
        pixCode: pixKey,
        numeroDocumento: (t.numeroDocumento || t.numerodocumento || t.numero_documento || t.fatura || '').toString(),
      };
    });
  }

  async verificaAcesso(contratoId: string): Promise<ServiceAccess | null> {
    try {
      const form = new FormData();
      const payload = this.getSGPPayload({ contrato: contratoId });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPVerificaAcessoResponse>('api/ura/verificaacesso/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      if (!data) return null;

      return {
        status: Number(data.status),
        message: data.msg,
        contractId: String(data.contratoId),
        serviceId: Number(data.servico_id),
        login: data.login,
        clientName: data.razaoSocial,
      };
    } catch (error) {
      console.error('Error in verificaAcesso:', error);
      return null;
    }
  }

  async liberacaoPromessa(contratoId: string): Promise<SGPLiberacaoPromessaResponse> {
    try {
      console.log('[SGP] Solicitando liberação por confiança para contrato:', contratoId);

      const form = new FormData();
      const payload = this.getSGPPayload({ contrato: contratoId });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPLiberacaoPromessaResponse>('api/ura/liberacaopromessa/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    } catch (error) {
      console.error('Error in liberacaoPromessa:', error);
      throw error;
    }
  }

  /**
   * Consulta cliente por CPF/CNPJ
   */
  async consultaCliente(cpfCnpj: string): Promise<User | null> {
    try {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      console.log('[SGP] Consultando cliente para:', cleanCpfCnpj);
      
      const formData = new FormData();
      const payload = this.getSGPPayload({ cpfcnpj: cleanCpfCnpj });
      Object.keys(payload).forEach(key => {
        formData.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPClientResponse>('api/ura/consultacliente/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data as any;
      console.log('[SGP] Resposta cliente recebida.');

      if (!data) return null;

      // Buscar faturas (pode vir no 'links' do consultacliente ou chamamos faturas/)
      let invoices: Invoice[] = [];
      console.log('[SGP] Verificando data.links:', data.links ? 'existe' : 'não existe', Array.isArray(data.links) ? 'é array' : 'não é array');
      if (data.links && Array.isArray(data.links) && data.links.length > 0) {
        console.log('[SGP] Usando faturas vindas do campo links do consultacliente. Total de links:', data.links.length);
        invoices = this.mapInvoices(data.links, data.contratoId?.toString());
      } else {
        console.log('[SGP] data.links não encontrado, chamando consultaFaturas');
        invoices = await this.consultaFaturas(cleanCpfCnpj);
      }

      // Caso 1: Formato com lista de contratos
      if (data.contratos && data.contratos.length > 0) {
        const clientName = data.contratos[0].razaoSocial || data.razaoSocial;
        const customerId = data.contratos[0].clienteId ? String(data.contratos[0].clienteId) : undefined;
        
        const contracts: Contract[] = data.contratos.map((c: any) => {
          const contractInvoices = invoices.filter(
            (inv) => inv.contractId === (c.contratoId || c.id || '').toString()
          );
          return this.mapSGPContract(c, contractInvoices);
        });

        return {
          cpfCnpj: cleanCpfCnpj,
          name: clientName,
          customerId,
          contracts,
        };
      } 
      // Caso 2: Formato direto com contratoId e links
      else if (data.contratoId) {
        const clientName = data.razaoSocial || '';
        const contract: Contract = this.mapSGPContract({
          contratoId: data.contratoId,
          razaoSocial: clientName,
          contratoStatusDisplay: 'Ativo',
        }, invoices);

        return {
          cpfCnpj: cleanCpfCnpj,
          name: clientName,
          contracts: [contract],
        };
      }

      return null;
    } catch (error: any) {
      console.error('Error in consultaCliente:', error);
      throw error;
    }
  }

  /**
   * Consulta planos cadastrados no painel
   */
  async getPlans(): Promise<Plan[]> {
    try {
      console.log('[API] Buscando planos no painel. URL:', this.publicApi.defaults.baseURL + '/public/plans/');
      console.log('[API] Token utilizado:', config.apiToken);
      
      const response = await this.publicApi.get('/public/plans/', {
        params: {
          provider_token: config.apiToken,
        },
      });

      console.log('[API] Resposta recebida do servidor:', JSON.stringify(response.data, null, 2));

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type as any,
          downloadSpeed: p.download_speed || 0,
          uploadSpeed: p.upload_speed || 0,
          price: p.price || 0,
          description: p.description
        }));
      }
      return [];
    } catch (error: any) {
      console.error('[API] Erro ao buscar planos:', error.message);
      if (error.response) {
        console.error('[API] Status do Erro:', error.response.status);
        console.error('[API] Dados do Erro:', JSON.stringify(error.response.data));
      }
      return [];
    }
  }

  async getAppConfig(): Promise<any> {
    try {
      const response = await this.publicApi.get('/public/config/', {
        params: {
          provider_token: config.apiToken,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching app config:', error);
      return null;
    }
  }

  private mapSGPContract(c: any, invoices: Invoice[]): Contract {
    const extractSpeed = (name: string): number => {
      const match = name.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 100;
    };

    const speed = extractSpeed(c.servico_plano || c.planointernet || '');

    let status: 'active' | 'inactive' | 'pending' | 'suspended' = 'inactive';
    const statusDisplay = (c.contratoStatusDisplay || '').toLowerCase();
    
    if (statusDisplay.includes('ativo') || statusDisplay.includes('liberado')) {
      status = 'active';
    } else if (statusDisplay.includes('bloqueado') || statusDisplay.includes('suspenso')) {
      status = 'suspended';
    } else if (statusDisplay.includes('pendente')) {
      status = 'pending';
    }

    return {
      id: (c.contratoId || c.id || '').toString(),
      number: (c.contratoId || c.id || '').toString(),
      clientName: c.razaoSocial,
      plan: {
        id: (c.contratoId || c.id || '').toString(),
        name: c.servico_plano || c.planointernet || 'Plano Internet',
        type: 'FIBRA' as const,
        downloadSpeed: speed,
        uploadSpeed: Math.floor(speed / 2),
        price: 0,
      },
      status: status,
      statusDisplay: c.contratoStatusDisplay,
      serviceLogin: c.servico_login,
      servicePassword: c.servico_senha,
      centralPassword: c.contratoCentralSenha,
      wifiSSID: c.servico_wifi_ssid,
      wifiSSID5: c.servico_wifi_ssid_5,
      wifiPassword: c.servico_wifi_password,
      wifiPassword5: c.servico_wifi_password_5,
      address: c.endereco_logradouro ? `${c.endereco_logradouro}, ${c.endereco_numero} - ${c.endereco_bairro}` : undefined,
      invoices: invoices,
      dataCadastro: c.dataCadastro,
    };
  }

  /**
   * Consultar CPE
   */
  async consultarCpe(contratoId: string, servicoId?: number): Promise<SGPCpeResponse | null> {
    try {
      console.log('[SGP] Consultando CPE para contrato:', contratoId);
      console.log('[SGP] Endpoint:', 'api/ura/cpemanage/');

      const form = new FormData();
      const payload: any = this.getSGPPayload({ contrato: contratoId });
      if (servicoId) {
        payload.servico = servicoId.toString();
      }
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPCpeResponse>('api/ura/cpemanage/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta CPE:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error fetching CPE data:', error);
      return null;
    }
  }

  /**
   * Alterar Senha e SSID do Wi-Fi
   */
  async alterarWifi(
    contratoId: string,
    servicoId: number,
    ssid: string,
    senha: string,
    ssid5: string,
    senha5: string
  ): Promise<{ success: boolean; msg: string }> {
    try {
      console.log('[SGP] Alterando Wi-Fi para contrato:', contratoId);
      console.log('[SGP] Endpoint:', 'api/ura/cpemanage/');

      const form = new FormData();
      const payload = this.getSGPPayload({
        contrato: contratoId,
        servico: servicoId.toString(),
        wifi_status: 'on',
        novo_ssid: ssid,
        nova_senha: senha,
        wifi_status_5g: 'on',
        novo_ssid_5g: ssid5,
        nova_senha_5g: senha5
      });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<{ success: boolean; msg: string }>('api/ura/cpemanage/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta Alteração Wi-Fi:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('Error altering Wifi:', error);
      const errorMessage = error.response?.data?.msg || error.message || 'Erro ao alterar Wi-Fi.';
      return { success: false, msg: errorMessage };
    }
  }

  /**
   * Extrato de uso de internet (Central Assinante)
   */
  async extratoUso(
    cpfCnpj: string,
    contratoId: string,
    senha: string,
    ano: number,
    mes: number
  ): Promise<any> {
    try {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      const form = new FormData();
      const payload = this.getSGPPayload({
        cpfcnpj: cleanCpfCnpj,
        senha: senha,
        contrato: contratoId,
        ano: String(ano),
        mes: String(mes)
      });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      console.log(`[SGP] Fetching extrato uso for ${cleanCpfCnpj} contract ${contratoId} ${mes}/${ano}`);

      const response = await this.getApi().post('api/central/extratouso/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching extrato de uso:', error.message);
      if (error.response) {
         console.error('Error response status:', error.response.status);
         console.error('Error response data:', JSON.stringify(error.response.data));
      }
      return null;
    }
  }


  /**
   * Listar chamados abertos
   */
  async getChamados(contratoId: string, cpfCnpj: string): Promise<SGPChamado[]> {
    try {
      console.log('[SGP] Buscando chamados para contrato:', contratoId);
      console.log('[SGP] Endpoint:', 'api/central/chamado/list/');

      const form = new FormData();
      const payload = this.getSGPPayload({
        cpfcnpj: cpfCnpj,
        contrato: contratoId,
        oc_status: '0' // 0 para abertos
      });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPChamado[]>('api/central/chamado/list/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta chamados:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error in getChamados:', error);
      throw error;
    }
  }

  /**
   * Abrir novo chamado
   */
  async abrirChamado(contratoId: string, tipo: number, conteudo: string): Promise<SGPCriarChamadoResponse> {
    try {
      console.log('[SGP] Abrindo novo chamado para contrato:', contratoId);
      console.log('[SGP] Endpoint:', 'api/ura/chamado/');

      const form = new FormData();
      const payload = this.getSGPPayload({
        contrato: contratoId,
        ocorrenciatipo: tipo.toString(),
        conteudo: conteudo,
        conteudolimpo: '1'
      });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPCriarChamadoResponse>('api/ura/chamado/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta abrir chamado:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error in abrirChamado:', error);
      throw error;
    }
  }

  /**
   * Listar tipos de ocorrência
   */
  async getTiposOcorrencia(cpfCnpj: string): Promise<SGPTipoOcorrencia[]> {
    try {
      console.log('[SGP] Buscando tipos de ocorrência');
      console.log('[SGP] Endpoint:', 'api/central/tipoocorrencia/list/');

      const form = new FormData();
      const payload = this.getSGPPayload({ cpfcnpj: cpfCnpj });
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<SGPTipoOcorrencia[]>('api/central/tipoocorrencia/list/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta tipos ocorrência:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error) {
      console.error('Error in getTiposOcorrencia:', error);
      throw error;
    }
  }


  /**
   * Get mock data for development/demo
   */
  getMockUser(cpfCnpj: string): User {
    return {
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      name: 'GILCEU',
      contracts: [
        {
          id: '1947',
          number: '#1947',
          clientName: 'GILCEU',
          plan: {
            id: '1',
            name: 'FIBRA 100 MEGA START',
            type: 'FIBRA',
            downloadSpeed: 100,
            uploadSpeed: 50,
            price: 89.90,
          },
          status: 'active',
          invoices: [],
        },
        {
          id: '917',
          number: '#917',
          clientName: 'BATISTA GOMES JUNIOR',
          plan: {
            id: '2',
            name: 'FIBRA 100 MEGA HIPER',
            type: 'FIBRA',
            downloadSpeed: 100,
            uploadSpeed: 50,
            price: 109.90,
          },
          status: 'active',
          invoices: [],
        },
        {
          id: '1336',
          number: '#1336',
          clientName: 'BATISTA GOMES JUNIOR',
          plan: {
            id: '3',
            name: 'FIBRA 100 MEGA SOFT',
            type: 'FIBRA',
            downloadSpeed: 100,
            uploadSpeed: 50,
            price: 89.90,
          },
          status: 'active',
          invoices: [],
        },
      ],
    };
  }
}

export const sgpService = new SGPService();
