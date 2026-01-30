import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { SGPClientResponse, User, Contract, Plan, ServiceAccess, SGPVerificaAcessoResponse, SGPTitulosResponse, Invoice, SGPCpeResponse, SGPLiberacaoPromessaResponse, SGPChamado, SGPCriarChamadoResponse, SGPTipoOcorrencia } from '../types';

class SGPService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      // Agora chamamos o nosso Proxy em vez do SGP diretamente
      baseURL: config.apiBaseUrl + 'sgp/',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  /**
   * Helper para injetar o token do provedor em todas as requisições
   */
  private getPayload(extra: any = {}) {
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
      console.log('[SGP Proxy] Consultando faturas para:', cleanCpfCnpj);
      
      const response = await this.api.post<SGPTitulosResponse>('api/ura/titulos/', this.getPayload({
        cpfcnpj: cleanCpfCnpj,
      }));

      console.log('[SGP] Resposta faturas:', JSON.stringify(response.data, null, 2));

      if (response.data?.titulos) {
        return response.data.titulos.map((t) => {
          let status: 'paid' | 'pending' | 'overdue' = 'pending';
          if (t.status === 'pago') {
            status = 'paid';
          } else if (t.status === 'aberto') {
            const dueDate = new Date(t.dataVencimento);
            const today = new Date();
            if (today > dueDate) {
              status = 'overdue';
            } else {
              status = 'pending';
            }
          }

          return {
            id: t.id.toString(),
            contractId: t.clienteContrato.toString(),
            description: 'Fatura Mensal',
            dueDate: t.dataVencimento,
            amount: t.valor,
            status: status,
            link: t.link.trim(),
            linkCobranca: t.link_cobranca.trim(),
            linhaDigitavel: t.linhaDigitavel,
            codigoPix: t.codigoPix,
            numeroDocumento: t.numeroDocumento,
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async verificaAcesso(contratoId: string): Promise<ServiceAccess | null> {
    try {
      const response = await this.api.post<SGPVerificaAcessoResponse>('api/ura/verificaacesso/', this.getPayload({
        contrato: contratoId
      }));

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
      console.log('[SGP Proxy] Solicitando liberação por confiança para contrato:', contratoId);

      const response = await this.api.post<SGPLiberacaoPromessaResponse>('api/ura/liberacaopromessa/', this.getPayload({
        contrato: contratoId
      }));

      console.log('[SGP] Resposta liberação:', JSON.stringify(response.data, null, 2));

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
      console.log('[SGP Proxy] Consultando cliente para:', cleanCpfCnpj);
      
      const response = await this.api.post<SGPClientResponse>('api/ura/consultacliente/', this.getPayload({
        cpfcnpj: cleanCpfCnpj
      }));

      console.log('[SGP] Resposta cliente:', JSON.stringify(response.data, null, 2));

      if (response.data?.contratos && response.data.contratos.length > 0) {
        // Fetch invoices in parallel/sequence
        const invoices = await this.consultaFaturas(cleanCpfCnpj);
        
        // Map SGP response to our User model
        const firstContract = response.data.contratos[0];
        const clientName = firstContract.razaoSocial;
        
        const extractSpeed = (name: string): number => {
          const match = name.match(/(\d+)/);
          return match ? parseInt(match[1], 10) : 100;
        };

        const contracts: Contract[] = response.data.contratos.map((c) => {
          const contractInvoices = invoices.filter(
            (inv) => inv.contractId === c.contratoId.toString()
          );
          
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
            id: c.contratoId.toString(),
            number: c.contratoId.toString(),
            clientName: c.razaoSocial,
            plan: {
              id: c.contratoId.toString(),
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
            wifiSSID: c.servico_wifi_ssid,
            wifiSSID5: c.servico_wifi_ssid_5, 
            wifiPassword: c.servico_wifi_password,
            wifiPassword5: c.servico_wifi_password_5,
            address: `${c.endereco_logradouro}, ${c.endereco_numero} - ${c.endereco_bairro}`,
            invoices: contractInvoices,
            dataCadastro: c.dataCadastro,
          };
        });

        return {
          cpfCnpj: cleanCpfCnpj,
          name: clientName,
          contracts,
        };
      }

      return null;
    } catch (error: any) {
      console.error('Error in consultaCliente:', error);
      throw error;
    }
  }

  /**
   * Consultar CPE
   */
  async consultarCpe(contratoId: string, servicoId?: number): Promise<SGPCpeResponse | null> {
    try {
      console.log('[SGP Proxy] Consultando CPE para contrato:', contratoId);

      const response = await this.api.post<SGPCpeResponse>('api/ura/cpemanage/', this.getPayload({
        contrato: contratoId,
        servico: servicoId
      }));

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
      console.log('[SGP Proxy] Alterando Wi-Fi para contrato:', contratoId);

      const response = await this.api.post<{ success: boolean; msg: string }>('api/ura/cpemanage/', this.getPayload({
        contrato: contratoId,
        servico: servicoId.toString(),
        wifi_status: 'on',
        novo_ssid: ssid,
        nova_senha: senha,
        wifi_status_5g: 'on',
        novo_ssid_5g: ssid5,
        nova_senha_5g: senha5
      }));

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
      const response = await this.api.post('api/central/extratouso/', this.getPayload({
        cpfcnpj: cleanCpfCnpj,
        senha: senha,
        contrato: contratoId,
        ano: String(ano),
        mes: String(mes)
      }));
      return response.data;
    } catch (error) {
      console.error('Error fetching extrato de uso:', error);
      return null;
    }
  }


  /**
   * Listar chamados abertos
   */
  async getChamados(contratoId: string, cpfCnpj: string): Promise<SGPChamado[]> {
    try {
      console.log('[SGP Proxy] Buscando chamados para contrato:', contratoId);

      const response = await this.api.post<SGPChamado[]>('api/central/chamado/list/', this.getPayload({
        cpfcnpj: cpfCnpj,
        contrato: contratoId,
        oc_status: '0'
      }));

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
      console.log('[SGP Proxy] Abrindo novo chamado para contrato:', contratoId);

      const response = await this.api.post<SGPCriarChamadoResponse>('api/ura/chamado/', this.getPayload({
        contrato: contratoId,
        ocorrenciatipo: tipo.toString(),
        conteudo: conteudo,
        conteudolimpo: '1'
      }));

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
      console.log('[SGP Proxy] Buscando tipos de ocorrência');

      const response = await this.api.post<SGPTipoOcorrencia[]>('api/central/tipoocorrencia/list/', this.getPayload({
        cpfcnpj: cpfCnpj
      }));

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
