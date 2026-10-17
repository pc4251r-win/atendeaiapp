'use client'

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Loader2, Send, Sparkles, X } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { brl, diasDesde } from '@/lib/format'
import { calcularRadar } from '@/lib/radar'
import type { ModuleKey } from '@/lib/types'
import { cn } from '@/lib/utils'

interface Msg {
  de: 'voce' | 'copiloto'
  texto: string
}

const SUGESTOES = ['Quanto faturei este mês?', 'Crie uma campanha para clientes inativos há 60 dias', 'Mostre o histórico da Maria', 'Quais oportunidades tenho hoje?']

const ROTAS: [RegExp, ModuleKey][] = [
  [/inbox|conversa/, 'inbox'],
  [/agenda/, 'agenda'],
  [/crm|clientes?\b/, 'crm'],
  [/radar|oportunidade/, 'radar'],
  [/pix|venda|cobran/, 'vendas'],
  [/p[oó]s.?venda|nps/, 'pos_venda'],
  [/funcion[aá]rio|agente/, 'funcionarios'],
  [/cat[aá]logo|pre[cç]o/, 'catalogo'],
  [/conhecimento|faq/, 'conhecimento'],
]

export function Copiloto() {
  const ctx = useData()
  const { db, empresa, copilotoAberto, setCopilotoAberto, goModule, dispararCampanhaSegmento } = ctx
  const [msgs, setMsgs] = useState<Msg[]>([
    { de: 'copiloto', texto: `Olá! Sou o Copiloto do ${empresa.nome}. Peça relatórios, campanhas ou o histórico de um cliente em linguagem natural.` },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const resumo = () => {
    const mesAtual = new Date().toISOString().slice(0, 7)
    const pagas = db.vendas_pagamentos.filter((v) => v.status === 'pago')
    const doMes = pagas.filter((v) => v.created_at.startsWith(mesAtual))
    const radar = calcularRadar(db).slice(0, 8)
    return [
      `Empresa: ${empresa.nome} (${empresa.segmento})`,
      `Faturamento do mês: ${brl(doMes.reduce((a, v) => a + v.valor, 0))} em ${doMes.length} vendas. Total histórico: ${brl(pagas.reduce((a, v) => a + v.valor, 0))}.`,
      `Clientes no CRM: ${db.clientes_crm.length}. Inativos 60+ dias: ${db.clientes_crm.filter((c) => c.ultima_compra && diasDesde(c.ultima_compra) >= 60).length}.`,
      `Atendimentos abertos: ${db.atendimentos.filter((a) => a.status !== 'finalizado').length}; aguardando humano: ${db.atendimentos.filter((a) => a.status === 'humano').length}.`,
      `Agendamentos futuros: ${db.agendamentos.filter((a) => a.status === 'confirmado').length}.`,
      `Top serviços: ${db.catalogo.slice(0, 5).map((c) => `${c.nome} ${brl(c.preco)}`).join('; ')}.`,
      `Oportunidades: ${radar.map((r) => r.titulo).join('; ')}.`,
    ].join('\n')
  }

  /** Intenções executáveis resolvidas localmente; o restante vai para o LLM com o resumo do negócio. */
  const executarLocal = (q: string): string | null => {
    const t = q.toLowerCase()
    const campanha = t.match(/campanha.*inativ\w*.*?(\d+)\s*dias?/) ?? (t.includes('campanha') && t.includes('inativ') ? [null, '60'] : null)
    if (campanha) {
      const n = dispararCampanhaSegmento({ filtro: 'inativos', dias: Number(campanha[1]) })
      return n
        ? `Feito! Disparei a reativação para ${n} clientes inativos há ${campanha[1]}+ dias (somente quem tem opt-in), com intervalo humanizado. As conversas estão abrindo no Inbox.`
        : `Não encontrei clientes inativos há ${campanha[1]}+ dias com opt-in ativo.`
    }
    if (t.includes('aniversari') && t.includes('campanha')) {
      const n = dispararCampanhaSegmento({ filtro: 'aniversariantes' })
      return `Campanha de aniversário enviada para ${n} clientes.`
    }
    const hist = t.match(/hist[oó]rico (?:d[aoe]s? )?(.+)/)
    if (hist) {
      const nome = hist[1].replace(/[?.!]/g, '').trim()
      const cli = db.clientes_crm.find((c) => c.nome.toLowerCase().includes(nome))
      if (!cli) return `Não encontrei nenhum cliente com "${nome}" no CRM.`
      const compras = db.vendas_pagamentos.filter((v) => v.cliente_telefone === cli.telefone && v.status === 'pago')
      const ags = db.agendamentos.filter((a) => a.cliente_telefone === cli.telefone)
      return `${cli.nome} · LTV ${brl(cli.ltv)} · score ${cli.score_lead}/100.\nCompras: ${compras.map((c) => `${c.item_nome} (${brl(c.valor)})`).join(', ') || 'nenhuma'}.\nAgendamentos: ${ags.length}. Última compra há ${cli.ultima_compra ? diasDesde(cli.ultima_compra) : '—'} dias.\nPreferências: ${cli.preferencias || 'não registradas'}.\nPróxima ação: ${cli.proxima_acao || 'nenhuma definida'}.`
    }
    const ir = t.match(/^(abrir|abra|ir para|vá para|mostrar|mostre)\s+(.+)/)
    if (ir) {
      const rota = ROTAS.find(([re]) => re.test(ir[2]))
      if (rota) {
        goModule(rota[1])
        return 'Abri o módulo para você.'
      }
    }
    if (/fatur|receita|vendi/.test(t)) {
      const mes = new Date().toISOString().slice(0, 7)
      const v = db.vendas_pagamentos.filter((x) => x.status === 'pago' && x.created_at.startsWith(mes))
      const total = v.reduce((a, x) => a + x.valor, 0)
      return `Este mês você faturou ${brl(total)} em ${v.length} vendas (ticket médio ${brl(v.length ? total / v.length : 0)}). Há ${db.vendas_pagamentos.filter((x) => x.status === 'pendente').length} cobranças PIX pendentes.`
    }
    if (/oportunidade|radar|hoje/.test(t)) {
      const r = calcularRadar(db).slice(0, 5)
      return r.length ? `Principais oportunidades:\n${r.map((o) => `• ${o.titulo}${o.valor ? ` (${brl(o.valor)})` : ''}`).join('\n')}` : 'Nenhuma oportunidade pendente agora.'
    }
    return null
  }

  async function perguntar(q: string) {
    const pergunta = q.trim()
    if (!pergunta || loading) return
    setInput('')
    setMsgs((m) => [...m, { de: 'voce', texto: pergunta }])
    const local = executarLocal(pergunta)
    let resposta = local
    if (!resposta) {
      setLoading(true)
      try {
        const res = await fetch('/api/ia/copiloto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pergunta, resumo: resumo() }),
        })
        const j = res.ok ? ((await res.json()) as { texto?: string }) : null
        resposta = j?.texto ?? `Ainda não sei executar isso, mas aqui vai um resumo:\n${resumo()}`
      } catch {
        resposta = `Sem conexão com a IA agora. Resumo do negócio:\n${resumo()}`
      } finally {
        setLoading(false)
      }
    }
    setMsgs((m) => [...m, { de: 'copiloto', texto: resposta! }])
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void perguntar(input)
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      void perguntar(input)
    }
  }

  if (!copilotoAberto) return null
  return (
    <aside aria-label="Copiloto" className="fixed inset-x-2 bottom-2 z-50 flex max-h-[80dvh] flex-col overflow-hidden rounded-2xl border border-ia/30 bg-card shadow-2xl animate-in slide-in-from-bottom-4 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[400px]">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ia/15 text-ia">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Copiloto do Dono</p>
            <p className="text-xs text-muted-foreground">Comandos em linguagem natural</p>
          </div>
        </div>
        <button type="button" onClick={() => setCopilotoAberto(false)} aria-label="Fechar Copiloto" className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
          <X className="size-4" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <p
            key={i}
            className={cn(
              'max-w-[90%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed',
              m.de === 'voce' ? 'self-end bg-ia text-foreground' : 'self-start bg-secondary',
            )}
          >
            {m.texto}
          </p>
        ))}
        {loading && (
          <p className="flex items-center gap-2 self-start text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" /> Pensando...
          </p>
        )}
        {msgs.length === 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s) => (
              <button key={s} type="button" onClick={() => void perguntar(s)} className="rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground hover:border-ia/50 hover:text-foreground">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <label htmlFor="copiloto-input" className="sr-only">
          Mensagem para o Copiloto
        </label>
        <textarea
          id="copiloto-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ex.: crie uma campanha para inativos há 90 dias"
          className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button type="submit" disabled={!input.trim() || loading} aria-label="Enviar" className="flex size-10 items-center justify-center rounded-lg bg-ia text-foreground disabled:opacity-50">
          <Send className="size-4" />
        </button>
      </form>
    </aside>
  )
}
