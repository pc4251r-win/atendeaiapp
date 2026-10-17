'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Cake, Clock, Headset, QrCode, Radar, RotateCcw, UserX } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, PageHeader, Stat, type Tone } from '@/components/atendeai/ui'
import { calcularRadar, type Oportunidade } from '@/lib/radar'
import { brl } from '@/lib/format'

const META: Record<Oportunidade['tipo'], { icon: typeof Radar; tone: Tone; label: string }> = {
  humano: { icon: Headset, tone: 'erro', label: 'Handoff' },
  pix_pendente: { icon: QrCode, tone: 'vendas', label: 'PIX' },
  orcamento_parado: { icon: Clock, tone: 'captacao', label: 'Orçamento' },
  recompra: { icon: RotateCcw, tone: 'pos', label: 'Recompra' },
  inativo: { icon: UserX, tone: 'neutral', label: 'Inativo' },
  aniversario: { icon: Cake, tone: 'ia', label: 'Aniversário' },
}

export function RadarFeed({ limite }: { limite?: number }) {
  const { db, goModule, setSelectedAtendimentoId } = useData()
  const ops = useMemo(() => calcularRadar(db), [db])
  const lista = limite ? ops.slice(0, limite) : ops
  if (!lista.length) return <Empty icon={<Radar />} title="Nada no radar agora" description="Quando surgir recompra, cliente sumido ou orçamento parado, aparece aqui." />
  return (
    <ul className="flex flex-col divide-y divide-border">
      {lista.map((o) => {
        const m = META[o.tipo]
        return (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => {
                if (o.modulo === 'inbox') setSelectedAtendimentoId(o.refId)
                goModule(o.modulo)
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40"
            >
              <Badge tone={m.tone}>
                <m.icon className="size-3" /> {m.label}
              </Badge>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{o.titulo}</span>
                <span className="truncate text-xs text-muted-foreground">{o.detalhe}</span>
              </span>
              {o.valor > 0 && <span className="hidden text-sm font-semibold sm:block">{brl(o.valor)}</span>}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function SimuladorRoi() {
  const [leads, setLeads] = useState(300)
  const [conv, setConv] = useState(8)
  const [ticket, setTicket] = useState(180)
  const [horas, setHoras] = useState(3)
  const convIa = Math.min(conv * 1.6, 60)
  const ganho = leads * ((convIa - conv) / 100) * ticket
  const horasMes = horas * 22
  return (
    <Card className="flex flex-col gap-5 p-5">
      <div>
        <h2 className="font-semibold">Simulador de ROI</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">Estimativa com aumento médio de 60% na conversão por responder em segundos, 24h por dia.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Leads por mês">
          <Input type="number" min={0} value={leads} onChange={(e) => setLeads(Number(e.target.value))} />
        </Field>
        <Field label="Conversão atual (%)">
          <Input type="number" min={0} max={100} value={conv} onChange={(e) => setConv(Number(e.target.value))} />
        </Field>
        <Field label="Ticket médio (R$)">
          <Input type="number" min={0} value={ticket} onChange={(e) => setTicket(Number(e.target.value))} />
        </Field>
        <Field label="Horas/dia no WhatsApp">
          <Input type="number" min={0} value={horas} onChange={(e) => setHoras(Number(e.target.value))} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-vendas/10 p-4">
          <p className="text-xs text-muted-foreground">Receita extra/mês</p>
          <p className="text-xl font-semibold text-vendas">{brl(Math.max(ganho, 0))}</p>
        </div>
        <div className="rounded-lg bg-ia/10 p-4">
          <p className="text-xs text-muted-foreground">Conversão com IA</p>
          <p className="text-xl font-semibold text-ia">{convIa.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg bg-captacao/10 p-4">
          <p className="text-xs text-muted-foreground">Horas liberadas/mês</p>
          <p className="text-xl font-semibold text-captacao">{horasMes}h</p>
        </div>
      </div>
    </Card>
  )
}

export function RadarModule() {
  const { db, dispararCampanhaSegmento } = useData()
  const ops = useMemo(() => calcularRadar(db), [db])
  const potencial = ops.reduce((a, o) => a + o.valor, 0)
  const inativos = ops.filter((o) => o.tipo === 'inativo').length

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Inteligência proativa"
        tone="pos"
        title="Radar de Oportunidades"
        description="A IA cruza CRM, agenda, vendas e pós-venda para mostrar onde está o dinheiro parado hoje."
        actions={
          inativos > 0 && (
            <Btn tone="pos" onClick={() => dispararCampanhaSegmento({ filtro: 'inativos', dias: 60 })}>
              <RotateCcw /> Reativar {inativos} inativos
            </Btn>
          )
        }
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Oportunidades" value={ops.length} tone="pos" icon={<Radar />} />
        <Stat label="Potencial em jogo" value={brl(potencial)} tone="vendas" />
        <Stat label="Urgentes" value={ops.filter((o) => o.urgencia === 'alta').length} tone="erro" />
        <Stat label="Recompras" value={ops.filter((o) => o.tipo === 'recompra').length} tone="captacao" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <Card className="overflow-hidden xl:col-span-3">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">Feed do dia</h2>
          </div>
          <RadarFeed />
        </Card>
        <div className="xl:col-span-2">
          <SimuladorRoi />
        </div>
      </div>
    </div>
  )
}
