export interface User {
  cpfCnpj: string;
  name: string;
  email?: string;
  customerId?: string; // ID do cliente no SGP
  contracts: Contract[];
}

export interface Contract {
  id: string;
  number: string;
  clientName: string;
  plan: Plan;
  status: 'active' | 'blocked' | 'cancelled' | 'inactive' | 'pending' | 'suspended';
  invoices: Invoice[];
  servicePassword?: string;
  centralPassword?: string;
  address?: string;
  wifiSSID?: string;
  wifiPassword?: string;
  wifiSSID5?: string;
  wifiPassword5?: string;
  serviceLogin?: string;
  statusDisplay?: string; // Also seen in sgpService
  dataCadastro?: string;
}

export interface Plan {
  id: string;
  name: string;
  type: string;
  downloadSpeed: number;
  uploadSpeed: number;
  price: number;
  description?: string;
}

export interface Invoice {
  id: string;
  contractId?: string;
  description: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'open' | 'overdue' | 'pending';
  barCode?: string;
  pixCode?: string;
  pdfUrl?: string;
  link?: string;
  linkCobranca?: string;
  linhaDigitavel?: string;
  codigoPix?: string;
  codigopix?: string; // SGP às vezes retorna em minúsculas
  numeroDocumento?: string;
}

export interface AuthContextData {
  user: User | null;
  loading: boolean;
  rememberCpf: boolean;
  setRememberCpf: (value: boolean) => void;
  signIn: (cpf: string, password?: string) => Promise<void>;
  signOut: () => void;
  activeContract: Contract | null;
  setActiveContract: (contract: Contract) => void;
  login: (user: User, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
}

export interface SGPLoginResponse {
  token: string;
  usuario: {
    id: number;
    nome: string;
    login: string;
  };
}

export interface SGPInvoice {
  id: number;
  tipo: string;
  data_vencimento: string;
  valor: number;
  linha_digitavel: string;
  pix_qrcode?: string;
  link_boleto?: string;
}

export interface SGPAcessoResponse {
  status: number;
  razaoSocial: string;
  cpfCnpj: string;
  msg: string;
  contratoId: number;
}

export interface SGPChamado {
  oc_protocolo: string;
  oc_tipo_id: number;
  oc_tipo_descricao: string;
  oc_data_cadastro: string;
  oc_data_encerramento: string;
  oc_conteudo: string;
  oc_status: number;
  oc_status_descricao: string;
  oc_origem_id: number;
  oc_origem_descricao: string;
  os_id: number;
  os_conteudo: string;
  os_servicoprestado: any;
  os_observacao: string;
  os_data_cadastro: string;
  os_data_agendamento: any;
  os_motivo_id: number;
  os_motivo_descricao: string;
  os_status: number;
  os_status_descricao: string;
  os_tecnico_responsavel: string;
  os_tecnicos_auxiliares: any[];
  cliente: string;
  cliente_id: number;
  contrato_id: number;
  contrato_pop_id: number;
  contrato_pop: string;
  servicos: any[];
  contrato_endereco_ll: string;
}

export interface SGPCriarChamadoResponse {
  status: number;
  razaoSocial: string;
  protocolo: string;
  cpfCnpj: string;
  msg: string;
  contratoId: number;
  id: number;
}

export interface SGPTipoOcorrencia {
  codigo: number;
  descricao: string;
}

export interface NotaFiscal {
  numero: number;
  serie: string;
  modelo: string;
  data_emissao: string;
  data_saida: string;
  valortotal: number;
  status: number;
  link: string;
  empresa_razao_social: string;
  empresa_nome_fantasia: string;
  empresa_cnpj: string;
  empresa_logradouro: string;
  empresa_numero: number;
  empresa_bairro: string;
  empresa_cidade: string;
  empresa_uf: string;
  empresa_cep: string;
  tipo_nf: number;
  cfop: string;
  desconto: number;
  outrosvalores: number;
  icms: number;
  infcomp?: string;
}

export interface TermoAceite {
  cliente_id: number;
  cliente_nome: string;
  aceite_metodo: string;
  aceite_ip: string;
  aceite_status: boolean;
  cliente_cpfcnpj: string;
  aceite_data: string;
  html: string;
  contrato: number;
  aceite_hash: string;
}

export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  Contracts: undefined;
  Plans: undefined;
  InvoiceDetails: { invoice: Invoice };
  Usage: undefined;
  PaymentPromise: undefined;
  InternetInfo: undefined;
  SupportList: undefined;
  SupportForm: undefined;
  SpeedTest: undefined;
  AIChat: undefined;
  Notifications: undefined;
  NotasFiscais: undefined;
  Terms: undefined;
};

export type MainTabsParamList = {
  Home: undefined;
  Invoices: undefined;
  PaymentPromisePlaceholder: undefined;
  Support: undefined;
  Profile: undefined;
};

export interface SGPCpeResponse {
  success: boolean;
  msg?: string;
  info: {
    // WiFi
    wifi_ssid?: string;
    ssid?: string;
    wifi_password?: string;
    wifi_ssid_5ghz?: string;
    wifi_password_5ghz?: string;
    wifi_enabled?: boolean;
    wifi_enabled_5ghz?: boolean;
    wifi_mode?: string;
    wifi_mode_5ghz?: string;
    wifi_channel?: string;
    wifi_channel_5ghz?: string;
    wifi_frequency?: string;
    wifi_frequency_5ghz?: string;
    // Informações do modem
    product_class?: string;
    model?: string;
    model_name?: string;
    manufacturer?: string;
    version?: string;
    oui?: string;
    // Informações de rede
    ip?: string;
    wan_ip?: string;
    wan_ip_address?: string;
    ip_address?: string;
    public_ip?: string;
    // Uptime (em dias)
    wan_up_time?: number;
    sys_up_time?: number;
    lastboot_date?: string;
    // Dispositivos conectados
    lan_devices?: any[]; // Array de dispositivos conectados
    interface_info?: {
      lan_devices?: any[];
      wlan_interfaces?: any[];
    };
    virtual_wifi?: any[];
    // Outros campos possíveis
    online_host_num?: number;
    associated_device_num?: number;
    hosts?: any[];
    connected_devices?: number;
    device_count?: number;
    total_devices?: number;
    // PPPoE
    pppoe_user?: string;
    pppoe_password?: string;
    [key: string]: any;
  };
}

export interface SGPClientResponse {
  contratos: Array<{
    contratoId: number;
    razaoSocial: string;
    servico_plano?: string;
    planointernet?: string;
    contratoStatusDisplay?: string;
    dataCadastro?: string;
    contratoCentralSenha?: string;
    [key: string]: any;
  }>;
}

export interface ServiceAccess {
  status: number;
  message: string;
  contractId: string;
  serviceId: number;
  login: string;
  clientName: string;
}

export interface SGPVerificaAcessoResponse {
  status: number;
  msg: string;
  contratoId: number;
  servico_id: number;
  login: string;
  razaoSocial: string;
}

export interface SGPTitulosResponse {
  titulos: Array<{
    id: number;
    clienteContrato: number;
    dataVencimento: string;
    valor: number;
    status: string;
    link: string;
    link_cobranca: string;
    linhaDigitavel: string;
    codigoPix?: string;
    codigopix?: string; // SGP às vezes retorna em minúsculas
    numeroDocumento: string;
  }>;
}

export interface SGPLiberacaoPromessaResponse {
  success: boolean;
  msg: string;
  status?: number | string;
  liberado_dias?: number;
}
