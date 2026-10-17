'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, XCircle } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Select, type Tone } from '@/components/atendeai/ui'
import { brl, fmtDate, isoDate, nowIso, phoneMask, uid } from '@/lib/format'
import type { Agendamento } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusTone: Record<Agendamento['status'], Tone> = {
  confirmado: 'captacao',
  pendente: 'pos',
  concluido: 'vendas',
  no_show: 'erro',
  cancelado: 'erro',
}
const statusLabel: Record<Agendamento['status'], string> = {
  confirmado: 'Confirmado',
  pendente: 'Pendente',
  concluido: 'Concluído',
  no_show: 'Não compareceu',
  cancelado: 'Cancelado',
}

function Calendar({ selected, onSelect, marks }: { selected: string | null; onSelect: (d: string | null) => void; marks: Record<string, number> }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const days = useMemo(() => {
    const start = new Date(cursor)
    start.setDate(1 - start.getDay())
    return Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])
  const hoje = isoDate(new Date())
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <Btn variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mês anterior">
          <ChevronLeft />
        </Btn>
        <span className="text-sm font-medium capitalize">{cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
        <Btn variant="ghost" size="sm" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Próximo mês">
          <ChevronRight />
        </Btn>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = isoDate(d)
          const inMonth = d.getMonth() === cursor.getMonth()
          const count = marks[iso] ?? 0
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(selected === iso ? null : iso)}
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                inMonth ? 'text-foreground' : 'text-muted-foreground/40',
                selected === iso ? 'bg-captacao text-foreground' : 'hover:bg-secondary',
                iso === hoje && selected !== iso && 'ring-1 ring-captacao',
              )}
              aria-label={`${fmtDate(iso)}${count ? `, ${count} agendamentos` : ''}`}
            >
              {d.getDate()}
              {count > 0 && <span className={cn('absolute bottom-1 size-1.5 rounded-full', selected === iso ? 'bg-foreground' : 'bg-captacao')} />}
            </button>
          )
        })}
      </div>
      {selected && (
        <Btn variant="ghost" size="sm" onClick={() => onSelect(null)}>
          Limpar filtro de data
        </Btn>
      )}
    </Card>
  )
}

export function Agenda() {
  const { db, empresa, upsert, concluirAgendamento, notify } = useData()
  const [dia, setDia] = useState<string | null>(null)
  const [status, setStatus] = useState<'todos' | Agendamento['status']>('todos')
  const [open, setOpen] = useState(false)
  const servicos = db.catalogo.filter((c) => c.ativo && c.tipo === 'servico')
  const [form, setForm] = useState({ cliente_nome: '', cliente_telefone: '', servicoId: servicos[0]?.id ?? '', data: isoDate(new Date()), horario: '10:00', status: 'confirmado' as Agendamento['status'] })

  const marks = useMemo(() => {
    const m: Record<string, number> = {}
    db.agendamentos.filter((a) => a.status !== 'cancelado').forEach((a) => (m[a.data] = (m[a.data] ?? 0) + 1))
    return m
  }, [db.agendamentos])

  const lista = db.agendamentos
    .filter((a) => (!dia || a.data === dia) && (status === 'todos' || a.status === status))
    .sort((a, b) => (a.data + a.horario).localeCompare(b.data + b.horario))

  function salvar() {
    const s = servicos.find((x) => x.id === form.servicoId)
    if (!s || !form.cliente_nome) return
    upsert('agendamentos', {
      id: uid(),
      empresa_id: empresa.id,
      cliente_nome: form.cliente_nome,
      cliente_telefone: form.cliente_telefone.replace(/\D/g, ''),
      servico_nome: s.nome,
      valor: s.preco,
      data: form.data,
      horario: form.horario,
      status: form.status,
      pagamento_status: 'pendente',
      created_at: nowIso(),
    })
    notify({ title: 'Agendamento criado', description: `${form.cliente_nome} · ${fmtDate(form.data)} às ${form.horario}`, tone: 'captacao' })
    setOpen(false)
    setForm((f) => ({ ...f, cliente_nome: '', cliente_telefone: '' }))
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Etapa 3"
        tone="captacao"
        title="Agenda Inteligente"
        description="A IA consulta estes horários em tempo real. Concluir um atendimento envia o cliente automaticamente para o Pós-Venda."
        actions={
          <Btn tone="captacao" onClick={() => setOpen(true)}>
            <Plus /> Novo Agendamento
          </Btn>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Calendar selected={dia} onSelect={setDia} marks={marks} />
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(['todos', 'confirmado', 'pendente', 'concluido', 'cancelado'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn('rounded-full border px-3 py-1 text-xs', status === s ? 'border-captacao bg-captacao/10 text-captacao' : 'border-border text-muted-foreground hover:text-foreground')}
              >
                {s === 'todos' ? 'Todos' : statusLabel[s]}
              </button>
            ))}
            {dia && <Badge tone="captacao">Dia {fmtDate(dia)}</Badge>}
          </div>
          <Card className="overflow-hidden">
            {lista.length === 0 ? (
              <Empty icon={<CalendarDays />} title="Nenhum agendamento" description="Ajuste os filtros ou crie um novo agendamento." />
            ) : (
              <ul>
                {lista.map((a) => (
                  <li key={a.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 md:flex-row md:items-center">
                    <div className="flex w-24 shrink-0 flex-col">
                      <span className="text-lg font-semibold">{a.horario}</span>
                      <span className="text-xs text-muted-foreground">{fmtDate(a.data)}</span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="font-medium">{a.cliente_nome}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.servico_nome} · {brl(a.valor)} · {phoneMask(a.cliente_telefone)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                      <Badge tone={a.pagamento_status === 'pendente' ? 'pos' : 'vendas'}>
                        {a.pagamento_status === 'pago_pix' ? 'Pago PIX' : a.pagamento_status === 'pago_cartao' ? 'Pago Cartão' : 'Pendente'}
                      </Badge>
                      {a.status === 'pendente' && (
                        <Btn size="sm" variant="soft" tone="captacao" onClick={() => upsert('agendamentos', { ...a, status: 'confirmado' })}>
                          Confirmar
                        </Btn>
                      )}
                      {(a.status === 'confirmado' || a.status === 'pendente') && (
                        <>
                          <Btn size="sm" tone="pos" onClick={() => concluirAgendamento(a.id)}>
                            <CheckCircle2 /> Concluir e enviar ao Pós-Venda
                          </Btn>
                          <Btn size="sm" variant="ghost" onClick={() => upsert('agendamentos', { ...a, status: 'cancelado' })} aria-label="Cancelar agendamento">
                            <XCircle />
                          </Btn>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo Agendamento">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            salvar()
          }}
        >
          <Field label="Nome do cliente">
            <Input required value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <Input required value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} placeholder="11999998888" inputMode="tel" />
          </Field>
          <Field label="Serviço">
            <Select value={form.servicoId} onChange={(e) => setForm({ ...form, servicoId: e.target.value })}>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome} — {brl(s.preco)} ({s.duracao_minutos} min)
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </Field>
            <Field label="Horário">
              <Input type="time" required value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Agendamento['status'] })}>
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Pendente</option>
            </Select>
          </Field>
          <Btn type="submit" tone="captacao" disabled={!servicos.length}>
            <Plus /> Criar agendamento
          </Btn>
        </form>
      </Modal>
    </div>
  )
}
