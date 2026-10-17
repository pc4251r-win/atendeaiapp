'use client'

import { useMemo, useState } from 'react'
import { Contact, MessageCircle, Search, ShieldOff } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Stat, Switch, Textarea } from '@/components/atendeai/ui'
import { brl, diasDesde, fmtDate, initials } from '@/lib/format'
import type { ClienteCRM } from '@/lib/types'
import { cn } from '@/lib/utils'

const scoreTone = (s: number) => (s >= 70 ? 'vendas' : s >= 40 ? 'captacao' : 'neutral') as 'vendas' | 'captacao' | 'neutral'

export function Crm() {
  const { db, upsert, abrirNoInbox, notify } = useData()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'quentes' | 'inativos' | 'optout'>('todos')
  const [sel, setSel] = useState<ClienteCRM | null>(null)

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return db.clientes_crm
      .filter((c) => !q || c.nome.toLowerCase().includes(q) || c.telefone.includes(q) || c.tags.some((t) => t.includes(q)))
      .filter((c) =>
        filtro === 'quentes' ? c.score_lead >= 70 : filtro === 'inativos' ? Boolean(c.ultima_compra && diasDesde(c.ultima_compra) >= 60) : filtro === 'optout' ? c.opt_out : true,
      )
      .sort((a, b) => b.score_lead - a.score_lead)
  }, [db.clientes_crm, busca, filtro])

  const conversaDe = (tel: string) => db.atendimentos.find((a) => a.cliente_telefone === tel)
  const ltvTotal = db.clientes_crm.reduce((a, c) => a + c.ltv, 0)
  const historico = sel
    ? {
        compras: db.vendas_pagamentos.filter((v) => v.cliente_telefone === sel.telefone),
        agenda: db.agendamentos.filter((a) => a.cliente_telefone === sel.telefone),
        conversa: db.atendimentos.find((a) => a.cliente_telefone === sel.telefone),
      }
    : null

  function salvar() {
    if (!sel) return
    upsert('clientes_crm', sel)
    notify({ title: 'Ficha atualizada', description: sel.nome, tone: 'captacao' })
    setSel(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Memória do negócio"
        tone="captacao"
        title="CRM de Clientes"
        description="Toda conversa no WhatsApp cria ou atualiza uma ficha automaticamente. A IA lê esta ficha antes de responder, então ela lembra preferências e histórico."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Clientes" value={db.clientes_crm.length} tone="captacao" icon={<Contact />} />
        <Stat label="LTV acumulado" value={brl(ltvTotal)} tone="vendas" />
        <Stat label="Leads quentes" value={db.clientes_crm.filter((c) => c.score_lead >= 70).length} hint="score ≥ 70" tone="pos" />
        <Stat label="Com opt-in" value={db.clientes_crm.filter((c) => c.opt_in && !c.opt_out).length} hint="aptos a campanhas" tone="ia" />
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="crm-busca" className="sr-only">
              Buscar cliente
            </label>
            <Input id="crm-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, telefone ou tag" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
            {(
              [
                ['todos', 'Todos'],
                ['quentes', 'Quentes'],
                ['inativos', 'Inativos 60d+'],
                ['optout', 'Opt-out'],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                aria-pressed={filtro === k}
                onClick={() => setFiltro(k)}
                className={cn('rounded-full border px-3 py-1.5 text-xs', filtro === k ? 'border-captacao bg-captacao/10 text-captacao' : 'border-border text-muted-foreground hover:text-foreground')}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {lista.length === 0 ? (
          <Empty icon={<Contact />} title="Nenhum cliente encontrado" description="Fichas são criadas automaticamente quando alguém conversa no WhatsApp." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Score</th>
                  <th className="p-3 font-medium">LTV</th>
                  <th className="p-3 font-medium">Última compra</th>
                  <th className="p-3 font-medium">Próxima ação</th>
                  <th className="p-3 font-medium sr-only">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                    <td className="p-3">
                      <button type="button" onClick={() => setSel(c)} className="flex items-center gap-3 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{initials(c.nome)}</span>
                        <span className="flex flex-col">
                          <span className="font-medium hover:underline">{c.nome}</span>
                          <span className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                            {c.telefone}
                            {c.opt_out && (
                              <Badge tone="erro">
                                <ShieldOff className="size-3" /> opt-out
                              </Badge>
                            )}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="p-3">
                      <Badge tone={scoreTone(c.score_lead)}>{c.score_lead}</Badge>
                    </td>
                    <td className="p-3 font-medium">{brl(c.ltv)}</td>
                    <td className="p-3 text-muted-foreground">{c.ultima_compra ? `há ${diasDesde(c.ultima_compra)}d` : '—'}</td>
                    <td className="max-w-56 truncate p-3 text-muted-foreground">{c.proxima_acao || '—'}</td>
                    <td className="p-3 text-right">
                      {conversaDe(c.telefone) && (
                        <Btn size="sm" variant="ghost" onClick={() => abrirNoInbox(conversaDe(c.telefone)!.id)} aria-label={`Abrir conversa com ${c.nome}`}>
                          <MessageCircle />
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={Boolean(sel)} onClose={() => setSel(null)} title={sel?.nome ?? ''} description={sel ? `${sel.telefone} · score ${sel.score_lead}/100` : ''} size="lg">
        {sel && historico && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="E-mail">
                <Input value={sel.email} onChange={(e) => setSel({ ...sel, email: e.target.value })} />
              </Field>
              <Field label="Aniversário">
                <Input type="date" value={sel.aniversario ?? ''} onChange={(e) => setSel({ ...sel, aniversario: e.target.value || null })} />
              </Field>
            </div>
            <Field label="Preferências (a IA usa isso nas respostas)">
              <Textarea value={sel.preferencias} onChange={(e) => setSel({ ...sel, preferencias: e.target.value })} />
            </Field>
            <Field label="Tags (separadas por vírgula)">
              <Input value={sel.tags.join(', ')} onChange={(e) => setSel({ ...sel, tags: e.target.value.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) })} />
            </Field>
            <Field label="Próxima ação">
              <Input value={sel.proxima_acao} onChange={(e) => setSel({ ...sel, proxima_acao: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Opt-in para campanhas</p>
                <p className="text-xs text-muted-foreground">Exigido pelas políticas da Meta. Clientes com opt-out nunca recebem disparos.</p>
              </div>
              <Switch checked={sel.opt_in && !sel.opt_out} onChange={(v) => setSel({ ...sel, opt_in: v, opt_out: !v })} label="Opt-in" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Compras</h3>
                {historico.compras.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma compra.</p>}
                {historico.compras.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <span>{v.item_nome}</span>
                    <span className="flex items-center gap-2">
                      {brl(v.valor)}
                      <Badge tone={v.status === 'pago' ? 'vendas' : 'pos'}>{v.status}</Badge>
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold">Agendamentos</h3>
                {historico.agenda.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento.</p>}
                {historico.agenda.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                    <span>{a.servico_nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(a.data)} {a.horario} · {a.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {historico.conversa && (
                <Btn variant="outline" onClick={() => abrirNoInbox(historico.conversa!.id)}>
                  <MessageCircle /> Abrir conversa
                </Btn>
              )}
              <Btn tone="captacao" onClick={salvar}>
                Salvar ficha
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
