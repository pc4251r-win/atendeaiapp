import type { DB, ModuleKey } from './types'
import { brl, diasDesde, isoDate, addDays } from './format'

export interface Oportunidade {
  id: string
  tipo: 'recompra' | 'inativo' | 'orcamento_parado' | 'aniversario' | 'humano' | 'pix_pendente'
  titulo: string
  detalhe: string
  valor: number
  urgencia: 'alta' | 'media' | 'baixa'
  modulo: ModuleKey
  refId: string
}

export function calcularRadar(db: DB): Oportunidade[] {
  const out: Oportunidade[] = []
  const hoje = isoDate(new Date())
  const em7 = isoDate(addDays(new Date(), 7))
  const mes = new Date().getMonth() + 1
  const ticket = (tel: string) => db.vendas_pagamentos.filter((v) => v.cliente_telefone === tel && v.status === 'pago').map((v) => v.valor)

  db.atendimentos
    .filter((a) => a.status === 'humano')
    .forEach((a) =>
      out.push({ id: `h-${a.id}`, tipo: 'humano', titulo: `${a.cliente_nome} aguarda um humano`, detalhe: a.ultima_mensagem.slice(0, 90), valor: a.valor_estimado, urgencia: 'alta', modulo: 'inbox', refId: a.id }),
    )

  db.vendas_pagamentos
    .filter((v) => v.status === 'pendente' && diasDesde(v.created_at) >= 1)
    .forEach((v) =>
      out.push({ id: `p-${v.id}`, tipo: 'pix_pendente', titulo: `PIX de ${v.cliente_nome} sem pagamento`, detalhe: `${v.item_nome} · há ${diasDesde(v.created_at)} dia(s)`, valor: v.valor, urgencia: 'alta', modulo: 'vendas', refId: v.id }),
    )

  db.atendimentos
    .filter((a) => (a.etapa_funil === 'em_negociacao' || a.etapa_funil === 'aguardando_pagamento') && a.status !== 'finalizado' && diasDesde(a.updated_at) >= 1)
    .forEach((a) =>
      out.push({ id: `o-${a.id}`, tipo: 'orcamento_parado', titulo: `Orçamento parado: ${a.cliente_nome}`, detalhe: `Sem resposta há ${diasDesde(a.updated_at)} dia(s)`, valor: a.valor_estimado, urgencia: 'media', modulo: 'inbox', refId: a.id }),
    )

  db.pos_venda_automacoes
    .filter((p) => p.tipo_acao === 'lembrete_recompra' && p.status === 'pendente' && p.data_programada <= em7)
    .forEach((p) => {
      const item = db.catalogo.find((c) => c.nome === p.item_comprado)
      out.push({
        id: `r-${p.id}`,
        tipo: 'recompra',
        titulo: `${p.cliente_nome} está no ponto de recompra`,
        detalhe: `${p.item_comprado} · ${p.data_programada <= hoje ? 'vencido' : `em ${p.data_programada.split('-').reverse().slice(0, 2).join('/')}`}`,
        valor: item?.preco ?? 0,
        urgencia: p.data_programada <= hoje ? 'alta' : 'media',
        modulo: 'pos_venda',
        refId: p.id,
      })
    })

  db.clientes_crm
    .filter((c) => !c.opt_out && c.ultima_compra && diasDesde(c.ultima_compra) >= 60)
    .forEach((c) => {
      const t = ticket(c.telefone)
      out.push({
        id: `i-${c.id}`,
        tipo: 'inativo',
        titulo: `${c.nome} sumiu há ${diasDesde(c.ultima_compra)} dias`,
        detalhe: `LTV ${brl(c.ltv)} · ${c.preferencias || 'sem preferências registradas'}`,
        valor: t.length ? t.reduce((a, b) => a + b, 0) / t.length : 0,
        urgencia: 'baixa',
        modulo: 'crm',
        refId: c.id,
      })
    })

  db.clientes_crm
    .filter((c) => !c.opt_out && c.aniversario && Number(c.aniversario.split('-')[1]) === mes)
    .forEach((c) =>
      out.push({ id: `a-${c.id}`, tipo: 'aniversario', titulo: `Aniversário de ${c.nome} este mês`, detalhe: 'Envie um mimo com cupom exclusivo', valor: 0, urgencia: 'baixa', modulo: 'crm', refId: c.id }),
    )

  const peso = { alta: 0, media: 1, baixa: 2 }
  return out.sort((a, b) => peso[a.urgencia] - peso[b.urgencia] || b.valor - a.valor)
}
