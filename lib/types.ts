/** Chaves internas dos planos; rótulos comerciais: Essencial, Profissional, Escala. */
export type Plano = 'starter' | 'pro' | 'enterprise'
export type Role = 'super_admin' | 'empresa' | 'funcionario'
export type StatusEmpresa = 'pendente' | 'ativo' | 'suspenso'

export interface Empresa {
  id: string
  nome: string
  cnpj: string
  plano: Plano
  status: StatusEmpresa
  segmento: string
  chave_pix: string
  limite_funcionarios: number
  limite_mensagens_ia: number
  matriz_id: string | null
  created_at: string
}

export interface Perfil {
  id: string
  auth_user_id: string | null
  empresa_id: string
  nome: string
  email: string
  role: Role
  /** Controle granular: quando definido, restringe os módulos do usuário. */
  modulos: ModuleKey[] | null
  ativo: boolean
  created_at: string
}

export type FuncaoIA = 'atendimento' | 'vendas' | 'agendamento' | 'campanha' | 'pos_venda' | 'suporte'
export type TomVoz = 'informal' | 'formal' | 'empatico' | 'consultivo'

export type PermissaoIA = 'enviar_pix' | 'agendar' | 'dar_desconto' | 'disparar_campanha' | 'transferir_humano'

export interface FuncionarioIA {
  id: string
  empresa_id: string
  nome: string
  funcao: FuncaoIA
  titulo_cargo: string
  tom_voz: TomVoz
  instrucoes_especificas: string
  meta_principal: string
  permissoes: PermissaoIA[]
  ativo: boolean
  created_at: string
}

export interface ClienteCRM {
  id: string
  empresa_id: string
  nome: string
  telefone: string
  email: string
  aniversario: string | null
  preferencias: string
  tags: string[]
  ltv: number
  score_lead: number
  ultima_compra: string | null
  ultima_interacao: string
  proxima_acao: string
  opt_in: boolean
  opt_out: boolean
  created_at: string
}

export type CategoriaConhecimento = 'faq' | 'horarios' | 'regras' | 'politicas' | 'produto'

export interface BaseConhecimento {
  id: string
  empresa_id: string
  categoria: CategoriaConhecimento
  titulo: string
  conteudo: string
  origem: 'manual' | 'aprendido'
  status: 'ativo' | 'sugerido'
  created_at: string
}

export interface Auditoria {
  id: string
  empresa_id: string
  ator: 'ia' | 'usuario' | 'sistema'
  ator_nome: string
  acao: string
  detalhe: string
  created_at: string
}

export interface Integracao {
  id: string
  empresa_id: string
  provedor: string
  categoria: 'crm' | 'pagamento' | 'estoque' | 'calendario' | 'webhook'
  status: 'conectado' | 'desconectado'
  config: Record<string, string>
  updated_at: string
}

export interface CatalogoItem {
  id: string
  empresa_id: string
  nome: string
  tipo: 'produto' | 'servico'
  preco: number
  duracao_minutos: number
  dias_retorno_pos_venda: number
  descricao: string
  ativo: boolean
  created_at: string
  custo_aquisicao: number
  custo_mao_obra: number
  /** null = usa a comissão padrão das configurações fiscais */
  comissao_percentual: number | null
}

export type Canal = 'whatsapp_lista' | 'instagram_ads' | 'pagina_captura' | 'google_meu_negocio'

export interface Campanha {
  id: string
  empresa_id: string
  titulo: string
  catalogo_id: string
  funcionario_ia_id: string
  canal: Canal
  copy_anuncio: string
  desconto_oferta: number
  link_rastreavel: string
  cliques: number
  leads_gerados: number
  vendas_geradas: number
  status: 'ativa' | 'pausada'
  created_at: string
}

export type EtapaFunil =
  | 'captado'
  | 'em_negociacao'
  | 'agendado'
  | 'aguardando_pagamento'
  | 'concluido'
  | 'pos_venda'

export interface Atendimento {
  id: string
  empresa_id: string
  cliente_nome: string
  cliente_telefone: string
  origem_campanha: string
  etapa_funil: EtapaFunil
  status: 'ia' | 'humano' | 'finalizado'
  valor_estimado: number
  ultima_mensagem: string
  updated_at: string
}

export interface Mensagem {
  id: string
  atendimento_id: string
  remetente: 'cliente' | 'ia' | 'humano'
  texto: string
  midia_url?: string | null
  created_at: string
}

export interface Agendamento {
  id: string
  empresa_id: string
  cliente_nome: string
  cliente_telefone: string
  servico_nome: string
  valor: number
  data: string
  horario: string
  status: 'confirmado' | 'pendente' | 'concluido' | 'no_show' | 'cancelado'
  pagamento_status: 'pendente' | 'pago_pix' | 'pago_cartao'
  created_at: string
}

export interface VendaPagamento {
  id: string
  empresa_id: string
  atendimento_id: string | null
  cliente_nome: string
  cliente_telefone: string
  item_nome: string
  valor: number
  metodo: 'pix' | 'link_cartao' | 'presencial'
  codigo_pix: string
  status: 'pendente' | 'pago' | 'cancelado'
  created_at: string
}

export type TipoAcaoPos = 'pesquisa_nps' | 'avaliacao_google' | 'lembrete_recompra' | 'cupom_fidelidade'

export interface PosVendaAutomacao {
  id: string
  empresa_id: string
  cliente_nome: string
  cliente_telefone: string
  item_comprado: string
  tipo_acao: TipoAcaoPos
  mensagem_enviada: string
  nota_nps: number | null
  data_programada: string
  status: 'pendente' | 'enviado' | 'respondido' | 'recomprou'
  created_at: string
}

export interface WhatsappConexao {
  id: string
  empresa_id: string
  api_provider: 'evolution_api' | 'cloud_api'
  instance_name: string
  display_phone_number: string
  status: 'conectado' | 'desconectado' | 'qr_pendente'
  qr_code_base64: string
  auto_resposta_ia: boolean
  updated_at: string
}

export interface ConfigLocal {
  recebedor_nome: string
  recebedor_cidade: string
  tipo_chave: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  google_link: string
  mensagem_nps: string
  cupom_fidelidade: string
  desconto_cupom: number
  regua_automatica: boolean
}

export type TemplateSite = 'minimalista' | 'vitrine' | 'clinica' | 'estetica' | 'oficina' | 'restaurante'
export type SecaoSite = 'sobre' | 'servicos' | 'galeria' | 'depoimentos' | 'contato' | 'mapa' | 'faq'
export type AcaoSite = 'visita' | 'clique_whatsapp' | 'clique_agendar' | 'formulario_enviado'

export interface SiteVitrine {
  id: string
  empresa_id: string
  slug: string
  publicado: boolean
  template: TemplateSite
  cor_destaque: string
  modo_escuro: boolean
  logo_url: string
  banner_url: string
  og_image_url: string
  favicon_url: string
  headline: string
  subtitulo: string
  sobre: string
  endereco: string
  telefone: string
  whatsapp: string
  instagram: string
  facebook: string
  tiktok: string
  horario_funcionamento: string
  meta_title: string
  meta_description: string
  secoes_ativas: Record<SecaoSite, boolean>
  faq: { pergunta: string; resposta: string }[]
  created_at: string
  updated_at: string
}

export interface SiteGaleria {
  id: string
  empresa_id: string
  imagem_url: string
  legenda: string
  ordem: number
}

export interface SiteDepoimento {
  id: string
  empresa_id: string
  nome_cliente: string
  texto: string
  nota: number
  foto_url: string
  ordem: number
}

export interface SiteVisita {
  id: string
  empresa_id: string
  origem: string
  acao: AcaoSite
  created_at: string
}

export interface SiteFormulario {
  id: string
  empresa_id: string
  nome: string
  telefone: string
  mensagem: string
  servico_id: string | null
  data_desejada: string | null
  horario: string
  status: 'novo' | 'convertido'
  created_at: string
}

export type RegimeTributario = 'mei' | 'simples' | 'presumido' | 'real'
export type AnexoSimples = 'I' | 'II' | 'III' | 'IV' | 'V'
export type CategoriaFinanceira = 'Estrutura' | 'Pessoal' | 'Marketing' | 'Tecnologia' | 'Fiscal' | 'Outros'
export type RecorrenciaCusto = 'mensal' | 'trimestral' | 'anual'
export type FormaPagamentoDespesa = 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'boleto' | 'transferencia'

export interface FinanceiroConfig {
  id: string
  empresa_id: string
  regime: RegimeTributario
  anexo: AnexoSimples
  faturamento_estimado: number
  /** em %, ex.: 6 = 6% */
  aliquota_efetiva: number
  aliquota_manual: boolean
  dia_pagamento: number
  /** em % sobre a venda */
  comissao_padrao: number
  das_mei: number
  simulador_ativo: boolean
  created_at: string
}

export interface CustoFixo {
  id: string
  empresa_id: string
  descricao: string
  categoria: CategoriaFinanceira
  valor: number
  recorrencia: RecorrenciaCusto
  dia_vencimento: number
  ativo: boolean
  created_at: string
}

export interface CustoVariavel {
  id: string
  empresa_id: string
  descricao: string
  tipo: 'percentual' | 'valor'
  valor: number
  /** null = aplica a todos os itens do catálogo */
  catalogo_id: string | null
  ativo: boolean
  created_at: string
}

export interface Despesa {
  id: string
  empresa_id: string
  descricao: string
  categoria: CategoriaFinanceira
  valor: number
  data: string
  pago: boolean
  forma_pagamento: FormaPagamentoDespesa
  created_at: string
}

export interface SimulacaoParametros {
  aumento_preco: number
  reducao_custo: number
  aumento_volume: number
  meta_lucro: number
}

export interface Simulacao {
  id: string
  empresa_id: string
  nome: string
  parametros: SimulacaoParametros
  resultado: { faturamento: number; lucro: number; margem: number }
  created_at: string
}

export interface MetaFinanceira {
  id: string
  empresa_id: string
  /** YYYY-MM */
  mes: string
  meta_faturamento: number
  meta_lucro: number
  created_at: string
}

export interface DB {
  financeiro_config: FinanceiroConfig[]
  financeiro_custos_fixos: CustoFixo[]
  financeiro_custos_variaveis: CustoVariavel[]
  financeiro_despesas: Despesa[]
  financeiro_simulacoes: Simulacao[]
  financeiro_metas: MetaFinanceira[]
  sites_vitrine: SiteVitrine[]
  sites_galeria: SiteGaleria[]
  sites_depoimentos: SiteDepoimento[]
  sites_visitas: SiteVisita[]
  sites_formularios: SiteFormulario[]
  empresas: Empresa[]
  perfis: Perfil[]
  funcionarios_ia: FuncionarioIA[]
  catalogo: CatalogoItem[]
  campanhas_divulgacao: Campanha[]
  atendimentos: Atendimento[]
  mensagens: Mensagem[]
  agendamentos: Agendamento[]
  vendas_pagamentos: VendaPagamento[]
  pos_venda_automacoes: PosVendaAutomacao[]
  whatsapp_conexoes: WhatsappConexao[]
  clientes_crm: ClienteCRM[]
  base_conhecimento: BaseConhecimento[]
  auditoria: Auditoria[]
  integracoes: Integracao[]
}

export type TableName = keyof DB

export type ModuleKey =
  | 'dashboard'
  | 'divulgacao'
  | 'inbox'
  | 'agenda'
  | 'vendas'
  | 'pos_venda'
  | 'crm'
  | 'radar'
  | 'funcionarios'
  | 'catalogo'
  | 'conhecimento'
  | 'whatsapp'
  | 'meu_site'
  | 'financeiro'
  | 'equipe'
  | 'integracoes'
  | 'auditoria'
  | 'master'

export type View = 'landing' | 'login' | 'cadastro' | 'app'
