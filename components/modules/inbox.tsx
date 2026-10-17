'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowLeft,
  Bot,
  CalendarPlus,
  CheckCircle2,
  Copy,
  Headset,
  KanbanSquare,
  MessageSquare,
  MessagesSquare,
  PanelRight,
  Phone,
  QrCode,
  Search,
  Send,
  Tag,
  UserPlus,
} from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, copyText, Empty, Field, Input, Modal, Select, Tabs, type Tone } from '@/components/atendeai/ui'
import { brl, ETAPAS, etapaLabel, fmtDate, fmtTime, initials, isoDate, phoneMask } from '@/lib/format'
import { horariosLivres, precoComDesconto } from '@/lib/ai'
import type { Atendimento, EtapaFunil } from '@/lib/types'
import { cn } from '@/lib/utils'

const etapaTone: Record<EtapaFunil, Tone> = {
  captado: 'captacao',
  em_negociacao: 'ia',
  agendado: 'captacao',
  aguardando_pagamento: 'vendas',
  concluido: 'vendas',
  pos_venda: 'pos',
}

type Filtro = 'todos' | 'ia' | 'humano' | 'finalizado'

function ConversationList({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const { db, typing } = useData()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [q, setQ] = useState('')
  const lista = useMemo(
    () =>
      [...db.atendimentos]
        .filter((a) => filtro === 'todos' || a.status === filtro)
        .filter((a) => !q || a.cliente_nome.toLowerCase().includes(q.toLowerCase()) || a.cliente_telefone.includes(q))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [db.atendimentos, filtro, q],
  )
  const filtros: { k: Filtro; l: string }[] = [
    { k: 'todos', l: 'Todos' },
    { k: 'ia', l: 'Com IA' },
    { k: 'humano', l: 'Com Humano' },
    { k: 'finalizado', l: 'Finalizados' },
  ]
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-3 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente ou telefone" className="pl-9" aria-label="Buscar conversas" />
        </div>
        <div className="flex flex-wrap gap-1">
          {filtros.map((f) => (
            <button
              key={f.k}
              type="button"
              onClick={() => setFiltro(f.k)}
              className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', filtro === f.k ? 'border-ia bg-ia/10 text-ia' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {f.l}
            </button>
          ))}
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {lista.length === 0 && <Empty icon={<MessageSquare />} title="Nenhuma conversa" />}
        {lista.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              className={cn('flex w-full gap-3 border-b border-border p-3 text-left transition-colors hover:bg-secondary/50', selectedId === a.id && 'bg-secondary')}
            >
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                {initials(a.cliente_nome)}
                <span className={cn('absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card', a.status === 'ia' ? 'bg-ia' : a.status === 'humano' ? 'bg-captacao' : 'bg-muted-foreground')} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.cliente_nome}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmtTime(a.updated_at)}</span>
                </span>
                <span className="truncate text-xs text-muted-foreground">{typing[a.id] ? <span className="text-ia">IA digitando...</span> : a.ultima_mensagem}</span>
                <span className="mt-1 flex gap-1">
                  <Badge tone={etapaTone[a.etapa_funil]} className="text-[10px]">{etapaLabel(a.etapa_funil)}</Badge>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChatWindow({ at, onBack, onTogglePanel }: { at: Atendimento; onBack: () => void; onTogglePanel: () => void }) {
  const { db, typing, simularMensagemCliente, enviarMensagemHumano, setEtapa, setAtendimentoStatus } = useData()
  const [texto, setTexto] = useState('')
  const [comoCliente, setComoCliente] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const msgs = useMemo(() => db.mensagens.filter((m) => m.atendimento_id === at.id).sort((a, b) => a.created_at.localeCompare(b.created_at)), [db.mensagens, at.id])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs.length, typing[at.id]])

  function enviar() {
    const t = texto.trim()
    if (!t) return
    if (comoCliente) simularMensagemCliente(at.id, t)
    else enviarMensagemHumano(at.id, t)
    setTexto('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-3">
        <button type="button" onClick={onBack} className="rounded-md p-1 text-muted-foreground hover:bg-secondary lg:hidden" aria-label="Voltar para lista">
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{at.cliente_nome}</span>
          <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <Tag className="size-3" /> {at.origem_campanha}
          </span>
        </div>
        <label className="sr-only" htmlFor="etapa-select">Etapa do funil</label>
        <Select id="etapa-select" value={at.etapa_funil} onChange={(e) => setEtapa(at.id, e.target.value as EtapaFunil)} className="h-8 w-auto text-xs">
          {ETAPAS.map((e) => (
            <option key={e.key} value={e.key}>
              {e.label}
            </option>
          ))}
        </Select>
        {at.status === 'humano' ? (
          <Btn size="sm" tone="ia" variant="soft" onClick={() => setAtendimentoStatus(at.id, 'ia')}>
            <Bot /> Devolver para IA
          </Btn>
        ) : (
          <Btn size="sm" tone="captacao" variant="soft" onClick={() => setAtendimentoStatus(at.id, 'humano')}>
            <Headset /> Assumir Atendimento Humano
          </Btn>
        )}
        <Btn size="sm" variant="ghost" onClick={onTogglePanel} className="xl:hidden" aria-label="Detalhes do lead">
          <PanelRight />
        </Btn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 p-4">
        <div className="flex flex-col gap-2">
          {msgs.map((m) => {
            if (m.texto.startsWith('[Sistema]'))
              return (
                <span key={m.id} className="self-center rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
                  {m.texto.replace('[Sistema] ', '')}
                </span>
              )
            const mine = m.remetente !== 'cliente'
            return (
              <div key={m.id} className={cn('flex max-w-[85%] flex-col gap-1 md:max-w-[70%]', mine ? 'self-end items-end' : 'self-start items-start')}>
                <div
                  className={cn(
                    'whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed [overflow-wrap:anywhere]',
                    m.remetente === 'cliente' && 'rounded-bl-sm bg-secondary',
                    m.remetente === 'ia' && 'rounded-br-sm border border-ia/30 bg-ia/15',
                    m.remetente === 'humano' && 'rounded-br-sm border border-captacao/30 bg-captacao/15',
                  )}
                >
                  {m.texto}
                </div>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {m.remetente === 'ia' && <Bot className="size-3 text-ia" />}
                  {m.remetente === 'humano' && <Headset className="size-3 text-captacao" />}
                  {m.remetente === 'ia' ? 'Funcionário de IA' : m.remetente === 'humano' ? 'Atendente' : 'Cliente'} · {fmtTime(m.created_at)}
                </span>
              </div>
            )
          })}
          {typing[at.id] && (
            <div className="flex items-center gap-1 self-end rounded-2xl rounded-br-sm border border-ia/30 bg-ia/15 px-4 py-3" aria-label="IA digitando">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-ia" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Btn size="sm" tone="ia" variant="soft" onClick={() => simularMensagemCliente(at.id)}>
            <UserPlus /> + Simular Mensagem do Cliente
          </Btn>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={comoCliente} onChange={(e) => setComoCliente(e.target.checked)} className="accent-ia" />
            Digitar como cliente (simulação)
          </label>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            enviar()
          }}
        >
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
            }}
            placeholder={comoCliente ? 'Mensagem do cliente (a IA responde se estiver no modo IA)...' : at.status === 'ia' ? 'Enviar como atendente (assume o atendimento)...' : 'Digite sua mensagem...'}
            aria-label="Mensagem"
          />
          <Btn type="submit" tone={comoCliente ? 'ia' : 'captacao'} aria-label="Enviar">
            <Send />
          </Btn>
        </form>
      </div>
    </div>
  )
}

function LeadPanel({ at }: { at: Atendimento }) {
  const { db, agendarHorario, enviarCobrancaPix, confirmarPagamentoAtendimento, notify } = useData()
  const [modal, setModal] = useState<'agendar' | 'pix' | null>(null)
  const servicos = db.catalogo.filter((c) => c.ativo)
  const camp = db.campanhas_divulgacao.find((c) => c.titulo === at.origem_campanha)
  const [itemId, setItemId] = useState(camp?.catalogo_id ?? servicos[0]?.id ?? '')
  const livres = useMemo(() => horariosLivres(db.agendamentos), [db.agendamentos])
  const [data, setData] = useState(livres[0]?.data ?? isoDate(new Date()))
  const [horario, setHorario] = useState(livres[0]?.horario ?? '10:00')
  const vendaPendente = db.vendas_pagamentos.filter((v) => v.atendimento_id === at.id && v.status === 'pendente').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const agend = db.agendamentos.filter((a) => a.cliente_telefone === at.cliente_telefone && a.status !== 'cancelado').sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const item = servicos.find((s) => s.id === itemId)
  const valorItem = item ? precoComDesconto(item.preco, camp?.catalogo_id === item.id ? camp.desconto_oferta : 0) : 0

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-lg font-semibold">{initials(at.cliente_nome)}</span>
        <p className="font-medium">{at.cliente_nome}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="size-3" /> {phoneMask(at.cliente_telefone)}
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Origem</span>
          <Badge tone="captacao" className="max-w-40 truncate">
            <Tag className="size-3" /> {at.origem_campanha}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Etapa</span>
          <Badge tone={etapaTone[at.etapa_funil]}>{etapaLabel(at.etapa_funil)}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Modo</span>
          <Badge tone={at.status === 'ia' ? 'ia' : at.status === 'humano' ? 'captacao' : 'neutral'}>{at.status === 'ia' ? 'IA' : at.status === 'humano' ? 'Humano' : 'Finalizado'}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Valor estimado</span>
          <span className="font-semibold text-vendas">{brl(at.valor_estimado)}</span>
        </div>
        {agend && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Agendamento</span>
            <span className="text-xs">
              {fmtDate(agend.data)} {agend.horario}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Fechamento</span>
        <Btn tone="captacao" variant="soft" onClick={() => setModal('agendar')}>
          <CalendarPlus /> Agendar Horário
        </Btn>
        <Btn tone="vendas" variant="soft" onClick={() => setModal('pix')}>
          <QrCode /> Enviar Cobrança PIX no Chat
        </Btn>
        <Btn tone="vendas" onClick={() => confirmarPagamentoAtendimento(at.id)} disabled={!vendaPendente}>
          <CheckCircle2 /> Confirmar Pagamento & Concluir Serviço
        </Btn>
      </div>

      {vendaPendente && (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-vendas/30 bg-vendas/5 p-3">
          <span className="text-xs text-muted-foreground">PIX pendente · {vendaPendente.item_nome}</span>
          <div className="rounded-lg bg-foreground p-2">
            <QRCodeSVG value={vendaPendente.codigo_pix} size={128} />
          </div>
          <span className="text-lg font-semibold text-vendas">{brl(vendaPendente.valor)}</span>
          <Btn
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (await copyText(vendaPendente.codigo_pix)) notify({ title: 'PIX Copia e Cola copiado', tone: 'vendas' })
            }}
          >
            <Copy /> Copiar código
          </Btn>
        </div>
      )}

      <Modal open={modal === 'agendar'} onClose={() => setModal(null)} title="Agendar Horário" description="A IA confirma o horário no chat e move o lead para Agendado.">
        <div className="flex flex-col gap-4">
          <Field label="Serviço">
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {brl(s.preco)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Horários livres sugeridos pela agenda</span>
            <div className="flex flex-wrap gap-2">
              {livres.map((l) => (
                <button
                  key={l.data + l.horario}
                  type="button"
                  onClick={() => {
                    setData(l.data)
                    setHorario(l.horario)
                  }}
                  className={cn('rounded-lg border px-3 py-1.5 text-xs', data === l.data && horario === l.horario ? 'border-captacao bg-captacao/10 text-captacao' : 'border-border text-muted-foreground')}
                >
                  {fmtDate(l.data)} · {l.horario}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </Field>
            <Field label="Horário">
              <Input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
            </Field>
          </div>
          <Btn
            tone="captacao"
            onClick={() => {
              agendarHorario(at.id, { catalogoId: itemId, data, horario })
              setModal(null)
            }}
            disabled={!itemId}
          >
            <CalendarPlus /> Confirmar agendamento
          </Btn>
        </div>
      </Modal>

      <Modal open={modal === 'pix'} onClose={() => setModal(null)} title="Enviar Cobrança PIX no Chat" description="Gera o PIX Copia e Cola com QR Code e a IA envia ao cliente.">
        <div className="flex flex-col gap-4">
          <Field label="Item do Catálogo">
            <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {brl(s.preco)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3 text-sm">
            <span className="text-muted-foreground">Valor da cobrança{camp?.catalogo_id === itemId ? ` (${camp.desconto_oferta}% OFF da campanha)` : ''}</span>
            <span className="text-lg font-semibold text-vendas">{brl(valorItem)}</span>
          </div>
          <Btn
            onClick={() => {
              enviarCobrancaPix(at.id, itemId)
              setModal(null)
            }}
            disabled={!itemId}
          >
            <QrCode /> Gerar e enviar PIX
          </Btn>
        </div>
      </Modal>
    </div>
  )
}

function KanbanView({ onOpen }: { onOpen: (id: string) => void }) {
  const { db, setEtapa } = useData()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<EtapaFunil | null>(null)
  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto p-4">
      {ETAPAS.map((col) => {
        const cards = db.atendimentos.filter((a) => a.etapa_funil === col.key).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        const total = cards.reduce((s, c) => s + c.valor_estimado, 0)
        return (
          <section
            key={col.key}
            aria-label={col.label}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(col.key)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              if (dragId) setEtapa(dragId, col.key)
              setDragId(null)
              setOver(null)
            }}
            className={cn('flex w-72 shrink-0 flex-col rounded-xl border bg-card', over === col.key ? 'border-ia' : 'border-border')}
          >
            <header className="flex items-center justify-between gap-2 border-b border-border p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Badge tone={etapaTone[col.key]}>{cards.length}</Badge> {col.label}
              </span>
              <span className="text-xs text-muted-foreground">{brl(total)}</span>
            </header>
            <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto p-2">
              {cards.map((c) => (
                <article
                  key={c.id}
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  className="flex cursor-grab flex-col gap-2 rounded-lg border border-border bg-background p-3 active:cursor-grabbing"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{c.cliente_nome}</span>
                    <span className={cn('size-2 shrink-0 rounded-full', c.status === 'ia' ? 'bg-ia' : c.status === 'humano' ? 'bg-captacao' : 'bg-muted-foreground')} aria-label={`Modo ${c.status}`} />
                  </div>
                  <span className="truncate text-xs text-muted-foreground">{c.ultima_mensagem}</span>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="captacao" className="max-w-36 truncate text-[10px]">{c.origem_campanha}</Badge>
                    <span className="text-xs font-semibold text-vendas">{brl(c.valor_estimado)}</span>
                  </div>
                  <div className="flex gap-2">
                    <label className="sr-only" htmlFor={`mv-${c.id}`}>Mover etapa</label>
                    <Select id={`mv-${c.id}`} value={c.etapa_funil} onChange={(e) => setEtapa(c.id, e.target.value as EtapaFunil)} className="h-7 text-xs">
                      {ETAPAS.map((e) => (
                        <option key={e.key} value={e.key}>
                          {e.label}
                        </option>
                      ))}
                    </Select>
                    <Btn size="sm" variant="outline" className="h-7" onClick={() => onOpen(c.id)} aria-label="Abrir conversa">
                      <MessageSquare />
                    </Btn>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function InboxModule() {
  const { db, selectedAtendimentoId, setSelectedAtendimentoId } = useData()
  const [view, setView] = useState<'chat' | 'kanban'>('chat')
  const [panelOpen, setPanelOpen] = useState(false)
  const at = db.atendimentos.find((a) => a.id === selectedAtendimentoId) ?? null

  useEffect(() => {
    if (!selectedAtendimentoId && db.atendimentos.length && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const first = [...db.atendimentos].sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
      setSelectedAtendimentoId(first.id)
    }
  }, [selectedAtendimentoId, db.atendimentos, setSelectedAtendimentoId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="flex flex-col">
          <span className="font-mono text-xs uppercase tracking-widest text-ia">Etapa 2</span>
          <h1 className="text-lg font-semibold">Inbox & Atendimento IA</h1>
        </div>
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: 'chat', label: (<><MessagesSquare /> Visão Chat</>) },
            { value: 'kanban', label: (<><KanbanSquare /> Quadro Kanban</>) },
          ]}
        />
      </div>

      {view === 'kanban' ? (
        <KanbanView
          onOpen={(id) => {
            setSelectedAtendimentoId(id)
            setView('chat')
          }}
        />
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_320px]">
          <aside className={cn('min-h-0 border-r border-border bg-card', at ? 'hidden lg:block' : 'block')}>
            <ConversationList selectedId={at?.id ?? null} onSelect={setSelectedAtendimentoId} />
          </aside>
          <section className={cn('min-h-0', at ? 'block' : 'hidden lg:block')}>
            {at ? (
              <ChatWindow at={at} onBack={() => setSelectedAtendimentoId(null)} onTogglePanel={() => setPanelOpen(true)} />
            ) : (
              <Empty icon={<MessageSquare />} title="Selecione uma conversa" description="Ou simule um cliente vindo de uma campanha no módulo Divulgação." />
            )}
          </section>
          <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card xl:block">{at && <LeadPanel key={at.id} at={at} />}</aside>
        </div>
      )}

      {at && (
        <Modal open={panelOpen} onClose={() => setPanelOpen(false)} title="Dados do lead e fechamento">
          <LeadPanel key={`m-${at.id}`} at={at} />
        </Modal>
      )}
    </div>
  )
}
