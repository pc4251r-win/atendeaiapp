'use client'

import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, Bot, CalendarDays, Megaphone, QrCode, Repeat, RotateCcw } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Btn, Card, PageHeader, Stat, toneSoft, type Tone } from '@/components/atendeai/ui'
import { addDays, brl, isoDate } from '@/lib/format'
import { cn } from '@/lib/utils'

const tooltipStyle = {
  contentStyle: { background: '#111827', border: '1px solid #1F2937', borderRadius: 8, color: '#F9FAFB', fontSize: 12 },
  labelStyle: { color: '#9CA3AF' },
}

export function Dashboard() {
  const { db, goModule, resetDemo, session } = useData()

  const funil = useMemo(() => {
    const cliques = db.campanhas_divulgacao.reduce((s, c) => s + c.cliques, 0)
    const leads = db.campanhas_divulgacao.reduce((s, c) => s + c.leads_gerados, 0)
    const agend = db.agendamentos.filter((a) => a.status !== 'cancelado').length
    const pagas = db.vendas_pagamentos.filter((v) => v.status === 'pago')
    const receita = pagas.reduce((s, v) => s + v.valor, 0)
    const pos = new Set(db.pos_venda_automacoes.map((p) => p.cliente_telefone)).size
    return [
      { label: 'Cliques na Divulgação', value: cliques.toLocaleString('pt-BR'), raw: cliques, tone: 'captacao' as Tone, icon: Megaphone },
      { label: 'Leads Captados', value: leads.toLocaleString('pt-BR'), raw: leads, tone: 'captacao' as Tone, icon: Bot },
      { label: 'Agendamentos', value: agend.toString(), raw: agend, tone: 'ia' as Tone, icon: CalendarDays },
      { label: `Vendas Pagas (${pagas.length})`, value: brl(receita), raw: pagas.length, tone: 'vendas' as Tone, icon: QrCode },
      { label: 'Clientes em Pós-Venda', value: pos.toString(), raw: pos, tone: 'pos' as Tone, icon: Repeat },
    ]
  }, [db])

  const semana = useMemo(() => {
    const hoje = new Date()
    return Array.from({ length: 7 }).map((_, i) => {
      const d = addDays(hoje, i - 6)
      const iso = isoDate(d)
      const dia = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
      const faturamento = db.vendas_pagamentos.filter((v) => v.status === 'pago' && isoDate(new Date(v.created_at)) === iso).reduce((s, v) => s + v.valor, 0)
      const msgs = db.mensagens.filter((m) => isoDate(new Date(m.created_at)) === iso && !m.texto.startsWith('[Sistema]'))
      return {
        dia,
        faturamento: Math.round(faturamento * 100) / 100,
        IA: msgs.filter((m) => m.remetente === 'ia').length,
        Humano: msgs.filter((m) => m.remetente === 'humano').length,
      }
    })
  }, [db])

  const iaCount = db.atendimentos.filter((a) => a.status === 'ia').length
  const humanoCount = db.atendimentos.filter((a) => a.status === 'humano').length
  const pendentePix = db.vendas_pagamentos.filter((v) => v.status === 'pendente').reduce((s, v) => s + v.valor, 0)
  const npsRespondidos = db.pos_venda_automacoes.filter((p) => p.nota_nps !== null)
  const npsMedia = npsRespondidos.length ? npsRespondidos.reduce((s, p) => s + (p.nota_nps ?? 0), 0) / npsRespondidos.length : 0

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Visão Geral 360º"
        title={`Olá, ${session.userName.split(' ')[0]}. Seu funil hoje.`}
        description="Acompanhe cada lead desde o clique no anúncio até a recompra. Todas as etapas são conectadas automaticamente."
        actions={
          <Btn variant="outline" size="sm" onClick={resetDemo}>
            <RotateCcw /> Restaurar dados demo
          </Btn>
        }
      />

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Funil Completo com taxas de conversão</h2>
        <ol className="grid gap-3 md:grid-cols-5">
          {funil.map((f, i) => {
            const prev = funil[i - 1]
            const taxa = prev && prev.raw > 0 ? Math.min(100, (f.raw / prev.raw) * 100) : null
            return (
              <li key={f.label} className="flex flex-col gap-2">
                <div className={cn('flex flex-col gap-2 rounded-lg border p-4', toneSoft[f.tone])}>
                  <f.icon className="size-4" />
                  <span className="text-xl font-semibold text-foreground">{f.value}</span>
                  <span className="text-xs text-muted-foreground">{f.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {taxa === null ? 'Topo do funil' : `${taxa.toFixed(1)}% da etapa anterior`}
                </span>
              </li>
            )
          })}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Atendimentos com IA" value={iaCount} hint={`${humanoCount} com humano agora`} tone="ia" icon={<Bot />} />
        <Stat label="Cobranças PIX pendentes" value={brl(pendentePix)} hint="Aguardando pagamento" tone="vendas" icon={<QrCode />} />
        <Stat label="NPS médio" value={npsMedia.toFixed(1)} hint={npsMedia >= 9 ? 'Zona de Excelência' : 'Zona de Qualidade'} tone="pos" icon={<Repeat />} />
        <Stat label="Campanhas ativas" value={db.campanhas_divulgacao.filter((c) => c.status === 'ativa').length} hint="Gerando leads" tone="captacao" icon={<Megaphone />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Faturamento semanal (PIX confirmado)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={semana} margin={{ left: -10, right: 8 }}>
                <defs>
                  <linearGradient id="fat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="dia" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="#10B981" strokeWidth={2} fill="url(#fat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">Mensagens: IA vs. Humano</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semana} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="dia" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} cursor={{ fill: '#1F2937' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="IA" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Humano" stackId="a" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Simular lead de campanha', m: 'divulgacao' as const, tone: 'captacao' as Tone, icon: Megaphone },
          { label: 'Abrir Inbox com IA', m: 'inbox' as const, tone: 'ia' as Tone, icon: Bot },
          { label: 'Ver cobranças PIX', m: 'vendas' as const, tone: 'vendas' as Tone, icon: QrCode },
          { label: 'Disparar pós-venda', m: 'pos_venda' as const, tone: 'pos' as Tone, icon: Repeat },
        ].map((a) => (
          <button key={a.m} type="button" onClick={() => goModule(a.m)} className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left text-sm font-medium transition-colors hover:bg-secondary">
            <span className="flex items-center gap-3">
              <span className={cn('flex size-8 items-center justify-center rounded-lg border [&_svg]:size-4', toneSoft[a.tone])}>
                <a.icon />
              </span>
              {a.label}
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </div>
  )
}
