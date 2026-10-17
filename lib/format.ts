import type { EtapaFunil, FuncaoIA, TomVoz, Canal, TipoAcaoPos, PermissaoIA, Plano } from './types'

export const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`

export const nowIso = () => new Date().toISOString()

export const isoDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const addDays = (d: Date, n: number) => {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

export const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export const ETAPAS: { key: EtapaFunil; label: string }[] = [
  { key: 'captado', label: 'Captado' },
  { key: 'em_negociacao', label: 'Em Negociação' },
  { key: 'agendado', label: 'Agendado' },
  { key: 'aguardando_pagamento', label: 'Aguardando PIX' },
  { key: 'concluido', label: 'Concluído' },
  { key: 'pos_venda', label: 'Pós-Venda' },
]

export const etapaLabel = (e: EtapaFunil) => ETAPAS.find((x) => x.key === e)?.label ?? e

export const FUNCOES: { key: FuncaoIA; label: string }[] = [
  { key: 'atendimento', label: 'Atendimento' },
  { key: 'vendas', label: 'Vendas / Closer' },
  { key: 'agendamento', label: 'Agendamento' },
  { key: 'campanha', label: 'Campanhas' },
  { key: 'pos_venda', label: 'Pós-Venda' },
  { key: 'suporte', label: 'Suporte' },
]

export const TONS: { key: TomVoz; label: string }[] = [
  { key: 'informal', label: 'Informal' },
  { key: 'formal', label: 'Formal' },
  { key: 'empatico', label: 'Empático' },
  { key: 'consultivo', label: 'Consultivo' },
]

export const PERMISSOES_IA: { key: PermissaoIA; label: string }[] = [
  { key: 'enviar_pix', label: 'Enviar cobrança PIX' },
  { key: 'agendar', label: 'Criar agendamentos' },
  { key: 'dar_desconto', label: 'Oferecer descontos' },
  { key: 'disparar_campanha', label: 'Disparar campanhas' },
  { key: 'transferir_humano', label: 'Transferir para humano' },
]

export const PLANO_LABEL: Record<Plano, string> = { starter: 'Essencial', pro: 'Profissional', enterprise: 'Escala' }
export const PLANO_PRECO: Record<Plano, number> = { starter: 147, pro: 297, enterprise: 597 }

export const diasDesde = (iso: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : Infinity

export const SEGMENTOS = [
  'Salão de Beleza',
  'Barbearia',
  'Clínica',
  'Estética',
  'Oficina Mecânica',
  'Restaurante',
  'Loja de Roupas',
  'Pet Shop',
  'Academia',
  'Consultoria',
  'Imobiliária',
  'E-commerce',
] as const

export const CANAIS: { key: Canal; label: string }[] = [
  { key: 'whatsapp_lista', label: 'Lista do WhatsApp' },
  { key: 'instagram_ads', label: 'Instagram Ads' },
  { key: 'pagina_captura', label: 'Página de Captura' },
  { key: 'google_meu_negocio', label: 'Google Meu Negócio' },
]

export const ACOES_POS: Record<TipoAcaoPos, string> = {
  pesquisa_nps: 'Pesquisa NPS + Google',
  avaliacao_google: 'Avaliação Google',
  lembrete_recompra: 'Lembrete de Recompra',
  cupom_fidelidade: 'Cupom Fidelidade',
}

export const phoneMask = (p: string) => {
  const d = p.replace(/\D/g, '')
  if (d.length < 10) return p
  return `(${d.slice(-11, -9)}) ${d.slice(-9, -4)}-${d.slice(-4)}`
}
