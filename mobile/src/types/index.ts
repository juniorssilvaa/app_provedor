export interface User {
  cpfCnpj: string;
  name: string;
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
};

export type MainTabsParamList = {
  Home: undefined;
  Invoices: undefined;
  PaymentPromisePlaceholder: undefined;
  SupportPlaceholder: undefined;
  Profile: undefined;
};

export interface SGPCpeResponse {
  success: boolean;
  msg?: string;
  info: {
    wifi_ssid?: string;
    ssid?: string;
    wifi_password?: string;
    wifi_ssid_5ghz?: string;
    wifi_password_5ghz?: string;
    online_host_num?: number;
    associated_device_num?: number;
    hosts?: any[];
    lan_devices?: any[];
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
    codigoPix: string;
    numeroDocumento: string;
  }>;
}

export interface SGPLiberacaoPromessaResponse {
  success: boolean;
  msg: string;
  status?: number | string;
  liberado_dias?: number;
}
