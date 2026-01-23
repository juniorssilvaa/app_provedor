import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { formatCPForCNPJ } from '../utils/validation';
import { SGPClientResponse, User, Contract, Plan, ServiceAccess, SGPVerificaAcessoResponse, SGPTitulosResponse, Invoice, SGPCpeResponse, SGPLiberacaoPromessaResponse, SGPChamado, SGPCriarChamadoResponse, SGPTipoOcorrencia, NotaFiscal, TermoAceite } from '../types';

class SGPService {
  private api: AxiosInstance | null = null;
  private publicApi: AxiosInstance;
  private sgpCredentials: { url: string; token: string; app: string } | null = null;
  private pendingConsultas = new Map<string, Promise<User | null>>();

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
   * Consulta faturas por CPF/CNPJ usando múltiplos endpoints para garantir dados completos
   */
  async consultaFaturas(cpfCnpj: string): Promise<Invoice[]> {
    try {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Coletar dados brutos para filtrar antes de mapear
      const rawInvoicesMap = new Map<string, any>();
      
      // 1. Consulta Títulos (endpoint principal)
      try {
        const responseTitulos = await this.getApi().post<SGPTitulosResponse>('api/ura/titulos/', this.getSGPPayload({
          cpfcnpj: cleanCpfCnpj,
        }));
        if (responseTitulos.data?.titulos) {
          responseTitulos.data.titulos.forEach((t: any) => {
            rawInvoicesMap.set((t.id || '').toString(), t);
          });
        }
      } catch (errTitulos) {}

      // 2. Consulta 2ª Via (complementar)
      try {
        const response2via = await this.getApi().post<any>('api/ura/fatura2via/', this.getSGPPayload({
          cpfcnpj: cleanCpfCnpj,
        }));
        if (response2via.data?.links) {
          response2via.data.links.forEach((t: any) => {
            const id = (t.id || t.fatura || '').toString();
            if (!rawInvoicesMap.has(id)) {
              rawInvoicesMap.set(id, t);
            }
          });
        }
      } catch (err2via) {}
      
      // 3. Filtrar dados brutos antes de mapear:
      // - Excluir canceladas
      // - Excluir futuras (dataVencimento > hoje) - EXCETO para faturas pagas
      // - Apenas status: pago, aberto ou vencido
      const validRawInvoices = Array.from(rawInvoicesMap.values()).filter((t: any) => {
        const rawStatus = (t.status || t.status_display || '').toLowerCase().trim();
        
        // Excluir canceladas
        if (rawStatus.includes('cancelado')) {
          console.log('[SGP] Fatura cancelada excluída:', t.id, t.status);
          return false;
        }
        
        // Verificar data de vencimento
        const dueDate = t.dataVencimento || t.vencimento || t.vencimento_original || '';
        if (!dueDate) {
          console.log('[SGP] Fatura sem data excluída:', t.id);
          return false;
        }
        
        const invDateStr = dueDate.split('T')[0]; // Pega apenas a data (YYYY-MM-DD)
        const isPaid = rawStatus.includes('pago') || rawStatus.includes('liquidado');
        const isOpen = rawStatus.includes('aberto');
        const isOverdue = rawStatus.includes('vencido') || rawStatus.includes('atrasado');
        
        // Excluir futuras:
        // - Pagas: podem ter qualquer data (sempre mostrar as 2 últimas)
        // - Abertas: podem ser futuras (mostrar se houver)
        // - Vencidas: nunca futuras (devem ter data <= hoje)
        if (isOverdue && invDateStr > todayStr) {
          console.log('[SGP] Fatura vencida futura excluída:', t.id, t.status, invDateStr, '>', todayStr);
          return false;
        }
        
        // Log para debug de faturas abertas
        if (isOpen) {
          console.log('[SGP] Fatura aberta encontrada:', t.id, 'Vencimento:', invDateStr, 'Hoje:', todayStr);
        }
        
        // Apenas status: pago, aberto ou vencido
        if (!rawStatus.includes('pago') && 
            !rawStatus.includes('liquidado') && 
            !rawStatus.includes('aberto') && 
            !rawStatus.includes('vencido') && 
            !rawStatus.includes('atrasado')) {
          console.log('[SGP] Fatura com status inválido excluída:', t.id, t.status);
          return false;
        }
        
        console.log('[SGP] Fatura válida:', t.id, t.status, invDateStr);
        return true;
      });
      
      // 4. Mapear apenas as válidas
      const mappedValid = this.mapInvoices(validRawInvoices, undefined);
      
      // 5. Separar por status
      const paidInvoices = mappedValid.filter(inv => inv.status === 'paid');
      const overdueInvoices = mappedValid.filter(inv => inv.status === 'overdue');
      const openInvoices = mappedValid.filter(inv => inv.status === 'pending');
      
      console.log('[SGP] Faturas separadas:', {
        pagas: paidInvoices.length,
        atrasadas: overdueInvoices.length,
        abertas: openInvoices.length,
        total: mappedValid.length
      });
      
      // 6. Selecionar faturas conforme regra:
      // - Sempre as 2 últimas pagas (mais recentes)
      // - Se houver atrasadas, a mais antiga (prioridade sobre abertas)
      // - Se não houver atrasadas mas houver abertas, a mais antiga
      const selectedInvoices: Invoice[] = [];
      
      // Ordenar pagas por data de vencimento (mais recente primeiro) - pegar as 2 mais recentes
      const sortedPaid = paidInvoices.sort((a, b) => 
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );
      
      // Ordenar atrasadas por data de vencimento (mais antiga primeiro) - pegar a mais antiga
      const sortedOverdue = overdueInvoices.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      // Ordenar abertas: priorizar não-futuras, depois futuras (mais antiga primeiro em cada grupo)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const openNotFuture = openInvoices.filter(inv => {
        const invDate = new Date(inv.dueDate);
        invDate.setHours(0, 0, 0, 0);
        return invDate <= today;
      });
      const openFuture = openInvoices.filter(inv => {
        const invDate = new Date(inv.dueDate);
        invDate.setHours(0, 0, 0, 0);
        return invDate > today;
      });
      
      const sortedOpenNotFuture = openNotFuture.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      const sortedOpenFuture = openFuture.sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );
      
      // Adicionar as 2 últimas pagas (mais recentes)
      selectedInvoices.push(...sortedPaid.slice(0, 2));
      
      // Adicionar a mais antiga atrasada (se houver)
      if (sortedOverdue.length > 0) {
        selectedInvoices.push(sortedOverdue[0]);
      } else if (sortedOpenNotFuture.length > 0) {
        // Se não houver atrasadas, adicionar a mais antiga aberta não-futura
        selectedInvoices.push(sortedOpenNotFuture[0]);
      } else if (sortedOpenFuture.length > 0) {
        // Se não houver abertas não-futuras, adicionar a mais antiga aberta futura
        selectedInvoices.push(sortedOpenFuture[0]);
      }
      
      // Remover duplicatas (caso uma fatura apareça em múltiplos grupos)
      const uniqueInvoices = Array.from(
        new Map(selectedInvoices.map(inv => [inv.id, inv])).values()
      );
      
      // Ordenar resultado final por data de vencimento (mais recente primeiro)
      const finalInvoices = uniqueInvoices.sort((a, b) => 
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );
      
      console.log('[SGP] consultaFaturas retornando:', finalInvoices.length, 'faturas');
      finalInvoices.forEach(inv => {
        console.log('[SGP] Fatura retornada:', inv.id, inv.status, inv.dueDate, 'Contrato:', inv.contractId);
      });
      
      return finalInvoices;
    } catch (error) {
      return [];
    }
  }

  private mapInvoices(rawInvoices: any[], defaultContractId?: string): Invoice[] {
    if (!rawInvoices || !Array.isArray(rawInvoices)) return [];

    console.log('[SGP] mapInvoices recebeu:', JSON.stringify(rawInvoices, null, 2));

    return rawInvoices.map((t: any) => {
      let status: 'paid' | 'pending' | 'overdue' = 'pending';

      const rawStatus = (t.status || t.status_display || '').toLowerCase();
      const todayStr = new Date().toISOString().split('T')[0];
      const dueDate = (t.dataVencimento || t.vencimento || t.vencimento_original || '').split('T')[0];

      if (rawStatus.includes('pago') || rawStatus.includes('liquidado')) {
        status = 'paid';
      } else if (rawStatus.includes('vencido') || rawStatus.includes('atrasado')) {
        status = 'overdue';
      } else if (rawStatus.includes('aberto')) {
        // Fatura aberta: verificar se está vencida
        if (dueDate && dueDate < todayStr) {
          status = 'overdue'; // Aberta mas vencida = vencida
        } else {
          status = 'pending'; // Aberta e não vencida = pendente
        }
      } else {
        // Para outros status, verificar se está vencida pela data
        if (dueDate && dueDate < todayStr) {
          status = 'overdue';
        } else {
          status = 'pending';
        }
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
  async consultaCliente(cpfCnpj: string, contractId?: string): Promise<User | null> {
    const cacheKey = `${cpfCnpj}_${contractId || 'all'}`;
    
    if (this.pendingConsultas.has(cacheKey)) {
      return this.pendingConsultas.get(cacheKey)!;
    }

    const consultaPromise = (async () => {
      try {
        const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
        
        const formData = new FormData();
        const payloadParams: any = { cpfcnpj: cleanCpfCnpj };
        if (contractId) {
          payloadParams.contrato = contractId;
        }

        const payload = this.getSGPPayload(payloadParams);
        Object.keys(payload).forEach(key => {
          formData.append(key, payload[key]);
        });

        const response = await this.getApi().post<SGPClientResponse>('api/ura/consultacliente/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = response.data as any;
        
        if (!data) return null;

        // 1. Buscar faturas de forma unificada (2ª via + Histórico)
        const invoices = await this.consultaFaturas(cleanCpfCnpj);
        
        // 2. Capturar senha da central para buscar lista completa de contratos se necessário
        let centralPassword = '';
        if (data.contratoCentralSenha) {
          centralPassword = data.contratoCentralSenha;
        } else if (data.contratos && data.contratos.length > 0) {
          centralPassword = data.contratos[0].contratoCentralSenha || '';
        }

        let extraContracts: any[] = [];
        if (centralPassword) {
          extraContracts = await this.consultarMeusContratos(cleanCpfCnpj, centralPassword);
        }

        // 3. Montar lista final de contratos
        let finalContracts: Contract[] = [];

        if (data.contratos && data.contratos.length > 0) {
          let contractsData = data.contratos;
          
          if (extraContracts.length > 0) {
              // Criar mapa dos contratos originais para merge de dados
              const originalContractsMap = new Map();
              contractsData.forEach((oc: any) => {
                  const id = (oc.contratoId || oc.id || oc.contrato || '').toString();
                  if (id) originalContractsMap.set(id, oc);
              });

              // Criar mapa dos contratos extras para evitar duplicatas
              const extraContractsMap = new Map();
              extraContracts.forEach((ec: any) => {
                  const ecId = (ec.contratoId || ec.id || ec.contrato || '').toString();
                  if (ecId) {
                      const original = originalContractsMap.get(ecId);
                      // Merge: usar dados extras, mas preservar campos do original se não existirem no extra
                      if (original) {
                          if (!ec.dataCadastro && original.dataCadastro) ec.dataCadastro = original.dataCadastro;
                          if (!ec.data_cadastro && original.data_cadastro) ec.data_cadastro = original.data_cadastro;
                          if (!ec.dataAtivacao && original.dataAtivacao) ec.dataAtivacao = original.dataAtivacao;
                      }
                      extraContractsMap.set(ecId, ec);
                  }
              });

              // Combinar: usar contratos extras (mais completos) + contratos originais que não estão nos extras
              const combinedContracts: any[] = [];
              
              // Adicionar todos os contratos extras
              extraContractsMap.forEach((contract) => {
                  combinedContracts.push(contract);
              });
              
              // Adicionar contratos originais que não estão nos extras
              contractsData.forEach((oc: any) => {
                  const id = (oc.contratoId || oc.id || oc.contrato || '').toString();
                  if (id && !extraContractsMap.has(id)) {
                      combinedContracts.push(oc);
                  }
              });

              contractsData = combinedContracts;
          }

          finalContracts = contractsData.map((c: any) => {
            const contractIdStr = (c.contrato || c.contratoId || c.id || '').toString();
            const contractInvoices = invoices.filter((inv) => inv.contractId === contractIdStr);
            console.log('[SGP] Contrato:', contractIdStr, 'Faturas associadas:', contractInvoices.length, 
              'Abertas:', contractInvoices.filter(i => i.status === 'pending').length,
              'Atrasadas:', contractInvoices.filter(i => i.status === 'overdue').length,
              'Pagas:', contractInvoices.filter(i => i.status === 'paid').length);
            if (!c.contratoCentralSenha && centralPassword) c.contratoCentralSenha = centralPassword;
            return this.mapSGPContract(c, contractInvoices);
          });
        } 
        else if (data.contratoId || extraContracts.length > 0) {
          if (extraContracts.length > 0) {
               finalContracts = extraContracts.map((c: any) => {
                  const contractIdStr = (c.contrato || c.contratoId || c.id || '').toString();
                  const contractInvoices = invoices.filter((inv) => inv.contractId === contractIdStr);
                  if (!c.contratoCentralSenha && centralPassword) c.contratoCentralSenha = centralPassword;
                  return this.mapSGPContract(c, contractInvoices);
               });
          } else {
              const targetContractId = (data.contratoId || '').toString();
              const filteredInvoices = invoices.filter(inv => !inv.contractId || inv.contractId.trim() === '' || inv.contractId === targetContractId);
              const contract: Contract = this.mapSGPContract({
                  contratoId: data.contratoId,
                  razaoSocial: data.razaoSocial || '',
                  contratoStatusDisplay: 'Ativo',
                  contratoCentralSenha: centralPassword,
                  dataCadastro: data.dataCadastro || data.data_cadastro
              }, filteredInvoices);
              finalContracts = [contract];
          }
        }

        // Remover duplicatas baseado no ID do contrato
        const uniqueContractsMap = new Map<string, Contract>();
        finalContracts.forEach((contract) => {
          if (contract.id && !uniqueContractsMap.has(contract.id)) {
            uniqueContractsMap.set(contract.id, contract);
          }
        });
        finalContracts = Array.from(uniqueContractsMap.values());

        const clientName = finalContracts.length > 0 ? finalContracts[0].clientName : (data.razaoSocial || '');
        const customerId = finalContracts.length > 0 ? finalContracts[0].id : undefined;

        return { 
          cpfCnpj: cleanCpfCnpj, 
          name: clientName, 
          customerId, 
          contracts: finalContracts 
        };
      } catch (error) {
        throw error;
      } finally {
        this.pendingConsultas.delete(cacheKey);
      }
    })();

    this.pendingConsultas.set(cacheKey, consultaPromise);
    return consultaPromise;
  }

  /**
   * Listar todos os contratos do cliente na central
   */
  async consultarMeusContratos(cpfCnpj: string, senhaCentral: string): Promise<any[]> {
    try {
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      const formData = new FormData();
      const payload = this.getSGPPayload({
        cpfcnpj: cleanCpfCnpj,
        senha: senhaCentral,
      });
      Object.keys(payload).forEach(key => {
        formData.append(key, payload[key]);
      });

      const response = await this.getApi().post('api/central/contratos/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      // A API retorna { auth: true, contratos: [...] }
      if (data && data.contratos && Array.isArray(data.contratos)) {
        return data.contratos;
      }
      // Fallback para formato antigo (array direto)
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error: any) {
      return [];
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

    // Extrair ID do contrato - tentar múltiplos campos possíveis
    const contractId = (c.contrato || c.contratoId || c.id || '').toString();
    
    let status: 'active' | 'inactive' | 'pending' | 'suspended' = 'inactive';
    // A API pode retornar status em diferentes campos
    const statusDisplay = (c.contratoStatusDisplay || c.status || '').toString().trim().toLowerCase();
    
    if (statusDisplay.includes('ativo') || statusDisplay.includes('liberado')) {
      status = 'active';
    } else if (statusDisplay.includes('bloqueado') || statusDisplay.includes('suspenso')) {
      status = 'suspended';
    } else if (statusDisplay.includes('pendente')) {
      status = 'pending';
    }

    return {
      id: contractId,
      number: contractId,
      clientName: c.razaoSocial || c.razaosocial,
      plan: {
        id: contractId,
        name: c.servico_plano || c.planointernet || 'Plano Internet',
        type: 'FIBRA' as const,
        downloadSpeed: speed,
        uploadSpeed: Math.floor(speed / 2),
        price: 0,
      },
      status: status,
      statusDisplay: (c.contratoStatusDisplay || c.status || '').toString().trim(),
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

      // Para consulta, usa GET com query params (não envia parâmetros de alteração)
      const payload: any = this.getSGPPayload({ contrato: contratoId });
      if (servicoId) {
        payload.servico = servicoId.toString();
      }

      // Tenta GET primeiro (método de consulta)
      try {
        const response = await this.getApi().get<SGPCpeResponse>('api/ura/cpemanage/', {
          params: payload,
        });

        console.log('[SGP] Resposta CPE (GET):', JSON.stringify(response.data, null, 2));
        return response.data;
      } catch (getError: any) {
        // Se GET falhar, tenta POST (fallback)
        console.log('[SGP] GET falhou, tentando POST como fallback');
        const form = new FormData();
        Object.keys(payload).forEach(key => {
          form.append(key, payload[key]);
        });

        const response = await this.getApi().post<SGPCpeResponse>('api/ura/cpemanage/', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        console.log('[SGP] Resposta CPE (POST):', JSON.stringify(response.data, null, 2));
        return response.data;
      }
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
   * Listar Notas Fiscais
   */
  async listarNotasFiscais(cpfCnpj: string, contratoId: string, senha: string): Promise<NotaFiscal[]> {
    try {
      console.log('[SGP] Listando notas fiscais para:', cpfCnpj);
      console.log('[SGP] Contrato ID:', contratoId);
      console.log('[SGP] Endpoint:', 'api/central/notafiscal/list/');

      // Para notas fiscais, o CPF precisa estar formatado (como no Postman)
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      const formattedCpfCnpj = formatCPForCNPJ(cleanCpfCnpj);
      
      const form = new FormData();
      const payload = this.getSGPPayload({
        cpfcnpj: formattedCpfCnpj, // Enviar formatado como no Postman
        contrato: contratoId,
        senha: senha,
      });
      
      console.log('[SGP] Payload notas fiscais:', {
        cpfcnpj: formattedCpfCnpj,
        contrato: contratoId,
        senha: senha ? '***' : 'não fornecida',
        token: payload.token ? 'existe' : 'não existe',
        app: payload.app,
      });
      
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      console.log('[SGP] Fazendo requisição POST para api/central/notafiscal/list/');
      const response = await this.getApi().post<NotaFiscal[]>('api/central/notafiscal/list/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('[SGP] Resposta notas fiscais recebida. Status:', response.status);
      console.log('[SGP] Total de notas:', Array.isArray(response.data) ? response.data.length : 0);
      console.log('[SGP] Resposta notas fiscais:', JSON.stringify(response.data, null, 2));
      return response.data || [];
    } catch (error: any) {
      console.error('[SGP] Erro ao buscar notas fiscais:', error);
      console.error('[SGP] Erro response:', error.response?.data);
      console.error('[SGP] Erro status:', error.response?.status);
      return [];
    }
  }

  /**
   * Buscar Termo de Aceite
   */
  async buscarTermoAceite(contratoId: string): Promise<TermoAceite | null> {
    try {
      console.log('[SGP] Buscando termo de aceite para contrato:', contratoId);
      console.log('[SGP] Endpoint:', `api/contrato/termoaceite/${contratoId}/`);

      const payload = this.getSGPPayload();
      
      console.log('[SGP] Payload termo aceite:', {
        token: payload.token ? 'existe' : 'não existe',
        app: payload.app,
      });

      // GET com query params
      const response = await this.getApi().get<TermoAceite>(`api/contrato/termoaceite/${contratoId}/`, {
        params: payload,
      });

      console.log('[SGP] Resposta termo aceite recebida. Status:', response.status);
      console.log('[SGP] Termo aceite status:', response.data?.aceite_status);
      return response.data || null;
    } catch (error: any) {
      console.error('[SGP] Erro ao buscar termo de aceite:', error);
      console.error('[SGP] Erro response:', error.response?.data);
      console.error('[SGP] Erro status:', error.response?.status);
      return null;
    }
  }

  /**
   * Aceitar Termo de Aceite
   */
  async aceitarTermoAceite(contratoId: string): Promise<{ success: boolean; msg?: string }> {
    try {
      console.log('[SGP] Aceitando termo de aceite para contrato:', contratoId);
      console.log('[SGP] Endpoint:', `api/contrato/termoaceite/${contratoId}`);

      const form = new FormData();
      const payload = this.getSGPPayload({
        aceite: '1', // Valor para aceitar
      });
      
      console.log('[SGP] Payload aceitar termo:', {
        aceite: '1',
        token: payload.token ? 'existe' : 'não existe',
        app: payload.app,
      });
      
      Object.keys(payload).forEach(key => {
        form.append(key, payload[key]);
      });

      const response = await this.getApi().post<{ success: boolean; msg?: string }>(
        `api/contrato/termoaceite/${contratoId}/`,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      console.log('[SGP] Resposta aceitar termo recebida. Status:', response.status);
      console.log('[SGP] Sucesso:', response.data?.success);
      return response.data || { success: false };
    } catch (error: any) {
      console.error('[SGP] Erro ao aceitar termo de aceite:', error);
      console.error('[SGP] Erro response:', error.response?.data);
      console.error('[SGP] Erro status:', error.response?.status);
      return { success: false, msg: error.response?.data?.msg || 'Erro ao aceitar termo' };
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
