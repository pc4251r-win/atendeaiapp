import type { BaseConhecimento, CatalogoItem, FuncaoIA, FuncionarioIA, PermissaoIA, TomVoz } from './types'

type AgenteTpl = {
  nome: string
  funcao: FuncaoIA
  titulo_cargo: string
  tom_voz: TomVoz
  instrucoes_especificas: string
  meta_principal: string
  permissoes: PermissaoIA[]
}
type ItemTpl = Pick<CatalogoItem, 'nome' | 'tipo' | 'preco' | 'duracao_minutos' | 'dias_retorno_pos_venda' | 'descricao'>
type KbTpl = Pick<BaseConhecimento, 'categoria' | 'titulo' | 'conteudo'>

export interface Playbook {
  id: string
  segmentos: string[]
  nome: string
  descricao: string
  agentes: AgenteTpl[]
  catalogo: ItemTpl[]
  conhecimento: KbTpl[]
}

const base: PermissaoIA[] = ['agendar', 'enviar_pix', 'transferir_humano']

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'beleza',
    segmentos: ['Salão de Beleza', 'Barbearia', 'Estética'],
    nome: 'Beleza & Estética',
    descricao: 'Agenda cheia, confirmação de horário e retorno no prazo certo de cada serviço.',
    agentes: [
      { nome: 'Luna', funcao: 'atendimento', titulo_cargo: 'Recepcionista Virtual', tom_voz: 'empatico', instrucoes_especificas: 'Cumprimente pelo nome, entenda o serviço desejado e ofereça até 3 horários.', meta_principal: 'Agendar horário confirmado', permissoes: base },
      { nome: 'Theo', funcao: 'vendas', titulo_cargo: 'Consultor de Pacotes', tom_voz: 'consultivo', instrucoes_especificas: 'Ofereça pacotes de sessões com PIX à vista.', meta_principal: 'Vender pacote', permissoes: [...base, 'dar_desconto'] },
      { nome: 'Nina', funcao: 'pos_venda', titulo_cargo: 'Customer Success', tom_voz: 'informal', instrucoes_especificas: 'Peça NPS e convide para o retorno no prazo do serviço.', meta_principal: 'Recompra', permissoes: base },
    ],
    catalogo: [
      { nome: 'Corte + Escova', tipo: 'servico', preco: 120, duracao_minutos: 60, dias_retorno_pos_venda: 30, descricao: 'Corte personalizado com finalização.' },
      { nome: 'Limpeza de Pele', tipo: 'servico', preco: 180, duracao_minutos: 75, dias_retorno_pos_venda: 30, descricao: 'Limpeza profunda com extração e máscara.' },
      { nome: 'Pacote 4 Sessões', tipo: 'servico', preco: 600, duracao_minutos: 60, dias_retorno_pos_venda: 45, descricao: 'Quatro sessões com 15% de economia.' },
    ],
    conhecimento: [
      { categoria: 'politicas', titulo: 'Atrasos', conteudo: 'Toleramos até 15 minutos de atraso. Depois disso o horário pode ser remarcado.' },
      { categoria: 'politicas', titulo: 'Cancelamento', conteudo: 'Cancelamentos até 12h antes sem custo.' },
    ],
  },
  {
    id: 'saude',
    segmentos: ['Clínica', 'Academia'],
    nome: 'Saúde & Bem-estar',
    descricao: 'Triagem acolhedora, lembrete de consulta e redução de no-show.',
    agentes: [
      { nome: 'Clara', funcao: 'agendamento', titulo_cargo: 'Secretária Clínica', tom_voz: 'formal', instrucoes_especificas: 'Nunca dê diagnóstico. Colete nome, convênio e motivo e ofereça horários.', meta_principal: 'Consulta agendada', permissoes: base },
      { nome: 'Davi', funcao: 'suporte', titulo_cargo: 'Atendimento ao Paciente', tom_voz: 'empatico', instrucoes_especificas: 'Tire dúvidas sobre preparo de exames e transfira urgências para humano.', meta_principal: 'Resolver dúvida', permissoes: ['transferir_humano', 'agendar'] },
    ],
    catalogo: [
      { nome: 'Consulta', tipo: 'servico', preco: 250, duracao_minutos: 40, dias_retorno_pos_venda: 90, descricao: 'Consulta particular.' },
      { nome: 'Retorno', tipo: 'servico', preco: 0, duracao_minutos: 20, dias_retorno_pos_venda: 180, descricao: 'Retorno em até 30 dias.' },
    ],
    conhecimento: [
      { categoria: 'regras', titulo: 'Urgências', conteudo: 'Em caso de dor intensa ou emergência, orientar procurar pronto-socorro e transferir para humano.' },
      { categoria: 'faq', titulo: 'Convênios', conteudo: 'Atendemos particular e emitimos recibo para reembolso.' },
    ],
  },
  {
    id: 'automotivo',
    segmentos: ['Oficina Mecânica'],
    nome: 'Automotivo',
    descricao: 'Orçamento rápido, aprovação por WhatsApp e lembrete de revisão.',
    agentes: [
      { nome: 'Rafa', funcao: 'atendimento', titulo_cargo: 'Consultor Técnico', tom_voz: 'informal', instrucoes_especificas: 'Pergunte modelo, ano e sintoma. Ofereça avaliação gratuita.', meta_principal: 'Agendar avaliação', permissoes: base },
      { nome: 'Gui', funcao: 'vendas', titulo_cargo: 'Orçamentista', tom_voz: 'consultivo', instrucoes_especificas: 'Envie orçamento detalhado e cobre sinal via PIX para reservar peças.', meta_principal: 'Aprovar orçamento', permissoes: [...base, 'dar_desconto'] },
    ],
    catalogo: [
      { nome: 'Revisão Completa', tipo: 'servico', preco: 390, duracao_minutos: 180, dias_retorno_pos_venda: 180, descricao: 'Troca de óleo, filtros e checklist de 40 itens.' },
      { nome: 'Alinhamento e Balanceamento', tipo: 'servico', preco: 140, duracao_minutos: 60, dias_retorno_pos_venda: 120, descricao: 'Com laudo.' },
    ],
    conhecimento: [{ categoria: 'politicas', titulo: 'Garantia', conteudo: 'Serviços com garantia de 90 dias.' }],
  },
  {
    id: 'varejo',
    segmentos: ['Restaurante', 'Loja de Roupas', 'Pet Shop', 'E-commerce'],
    nome: 'Varejo & Food',
    descricao: 'Cardápio/vitrine no chat, pedido com PIX e reativação de clientes inativos.',
    agentes: [
      { nome: 'Mel', funcao: 'vendas', titulo_cargo: 'Vendedora Digital', tom_voz: 'informal', instrucoes_especificas: 'Mostre os mais vendidos, sugira combo e feche com PIX.', meta_principal: 'Pedido pago', permissoes: [...base, 'dar_desconto'] },
      { nome: 'Leo', funcao: 'campanha', titulo_cargo: 'Growth', tom_voz: 'empatico', instrucoes_especificas: 'Reative clientes com cupom e respeite opt-out.', meta_principal: 'Recompra', permissoes: ['disparar_campanha', 'enviar_pix'] },
    ],
    catalogo: [
      { nome: 'Produto Destaque', tipo: 'produto', preco: 89.9, duracao_minutos: 0, dias_retorno_pos_venda: 30, descricao: 'Edite com seu produto mais vendido.' },
      { nome: 'Combo da Semana', tipo: 'produto', preco: 149.9, duracao_minutos: 0, dias_retorno_pos_venda: 20, descricao: 'Combo promocional.' },
    ],
    conhecimento: [{ categoria: 'politicas', titulo: 'Trocas', conteudo: 'Trocas em até 7 dias com etiqueta.' }],
  },
  {
    id: 'servicos',
    segmentos: ['Consultoria', 'Imobiliária', 'Serviços'],
    nome: 'Serviços & Consultoria',
    descricao: 'Qualificação de lead, reunião agendada e follow-up de proposta.',
    agentes: [
      { nome: 'Sofia', funcao: 'atendimento', titulo_cargo: 'SDR', tom_voz: 'consultivo', instrucoes_especificas: 'Qualifique com orçamento, prazo e decisor antes de agendar.', meta_principal: 'Reunião agendada', permissoes: base },
      { nome: 'Bruno', funcao: 'vendas', titulo_cargo: 'Executivo de Contas', tom_voz: 'formal', instrucoes_especificas: 'Faça follow-up de propostas paradas há mais de 48h.', meta_principal: 'Proposta aceita', permissoes: base },
    ],
    catalogo: [
      { nome: 'Diagnóstico Inicial', tipo: 'servico', preco: 0, duracao_minutos: 45, dias_retorno_pos_venda: 15, descricao: 'Reunião gratuita de diagnóstico.' },
      { nome: 'Projeto Mensal', tipo: 'servico', preco: 1500, duracao_minutos: 0, dias_retorno_pos_venda: 30, descricao: 'Acompanhamento mensal.' },
    ],
    conhecimento: [{ categoria: 'horarios', titulo: 'Reuniões', conteudo: 'Reuniões de segunda a sexta, das 9h às 18h, por videochamada.' }],
  },
]

export const playbookPara = (segmento: string) =>
  PLAYBOOKS.find((p) => p.segmentos.includes(segmento)) ?? PLAYBOOKS[PLAYBOOKS.length - 1]

/** Marketplace de agentes: modelos prontos para instalar com um clique. */
export const MARKETPLACE_AGENTES: (AgenteTpl & { destaque: string })[] = PLAYBOOKS.flatMap((p) =>
  p.agentes.map((a) => ({ ...a, destaque: p.nome })),
)

export type NovoAgente = Omit<FuncionarioIA, 'id' | 'empresa_id' | 'created_at' | 'ativo'>
