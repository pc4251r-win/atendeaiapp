'use client'

import { useState } from 'react'
import { BellRing, Gift, Repeat, Save, Send, Star, ThumbsUp, TrendingUp } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, PageHeader, Select, Stat, Switch, Textarea, type Tone } from '@/components/atendeai/ui'
import { ACOES_POS, addDays, brl, fmtDate, isoDate } from '@/lib/format'
import type { PosVendaAutomacao } from '@/lib/types'
import { cn } from '@/lib/utils'

const statusTone: Record<PosVendaAutomacao['status'], Tone> = {
  pendente: 'pos',
  enviado: 'captacao',
  respondido: 'ia',
  recomprou: 'vendas',
}

function Regua() {
  const { config, updateConfig, notify } = useData()
  const [local, setLocal] = useState(config)
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Repeat className="size-4 text-pos" />
          <h2 className="font-medium">Régua Automática de Pós-Venda</h2>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Disparo automático
          <Switch checked={local.regua_automatica} onChange={(v) => setLocal({ ...local, regua_automatica: v })} label="Disparo automático" />
        </label>
      </div>
      <Field label="Mensagem de NPS pós-serviço" hint="Use {nome} e {item} como variáveis.">
        <Textarea value={local.mensagem_nps} onChange={(e) => setLocal({ ...local, mensagem_nps: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Link do Google Meu Negócio">
          <Input value={local.google_link} onChange={(e) => setLocal({ ...local, google_link: e.target.value })} />
        </Field>
        <Field label="Cupom de fidelidade">
          <Input value={local.cupom_fidelidade} onChange={(e) => setLocal({ ...local, cupom_fidelidade: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Desconto do cupom (%)">
          <Input type="number" min={0} max={90} value={local.desconto_cupom} onChange={(e) => setLocal({ ...local, desconto_cupom: Number(e.target.value) })} />
        </Field>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        O lembrete de retorno é programado conforme o campo &quot;Prazo de Retorno&quot; de cada item do Catálogo.
      </p>
      <Btn
        tone="pos"
        className="self-start"
        onClick={() => {
          updateConfig(local)
          notify({ title: 'Régua de pós-venda salva', tone: 'pos' })
        }}
      >
        <Save /> Salvar régua
      </Btn>
    </Card>
  )
}

export function PosVenda() {
  const { db, dispararReativacao, registrarNps, upsert } = useData()
  const [filtro, setFiltro] = useState<'todos' | PosVendaAutomacao['status']>('todos')

  const notas = db.pos_venda_automacoes.filter((p) => p.nota_nps !== null).map((p) => p.nota_nps as number)
  const promotores = notas.filter((n) => n >= 9).length
  const detratores = notas.filter((n) => n <= 6).length
  const nps = notas.length ? Math.round(((promotores - detratores) / notas.length) * 100) : 0
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0
  const limite = isoDate(addDays(new Date(), 7))
  const alertas = db.pos_venda_automacoes.filter((p) => p.tipo_acao === 'lembrete_recompra' && p.status === 'pendente' && p.data_programada <= limite).length
  const recuperada = db.pos_venda_automacoes
    .filter((p) => p.status === 'recomprou')
    .reduce((s, p) => s + (db.catalogo.find((c) => c.nome === p.item_comprado)?.preco ?? 0), 0)

  const lista = [...db.pos_venda_automacoes]
    .filter((p) => filtro === 'todos' || p.status === filtro)
    .sort((a, b) => a.data_programada.localeCompare(b.data_programada))
  const hoje = isoDate(new Date())

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Etapa 5"
        tone="pos"
        title="Pós-Venda, NPS & Recompra"
        description="Cada pagamento confirmado cria automaticamente uma pesquisa NPS e um lembrete de recompra. Dispare a reativação e a conversa volta para o Inbox."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Nota Média NPS" value={media.toFixed(1)} hint={`NPS ${nps} · ${nps >= 75 ? 'Zona de Excelência' : nps >= 50 ? 'Zona de Qualidade' : 'Zona de Melhoria'}`} tone="pos" icon={<ThumbsUp />} />
        <Stat label="Avaliações 5 Estrelas no Google" value={promotores} hint="Promotores convidados" tone="pos" icon={<Star />} />
        <Stat label="Alertas de Retorno/Recompra" value={alertas} hint="Nos próximos 7 dias" tone="captacao" icon={<BellRing />} />
        <Stat label="Receita Recuperada" value={brl(recuperada)} hint="Clientes que recompraram" tone="vendas" icon={<TrendingUp />} />
      </div>

      <Regua />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="font-medium">Clientes em pós-venda</h2>
          <div className="flex flex-wrap gap-1">
            {(['todos', 'pendente', 'enviado', 'respondido', 'recomprou'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFiltro(s)}
                className={cn('rounded-full border px-3 py-1 text-xs capitalize', filtro === s ? 'border-pos bg-pos/10 text-pos' : 'border-border text-muted-foreground')}
              >
                {s === 'todos' ? 'Todos' : s}
              </button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <Empty icon={<Gift />} title="Nenhum cliente em pós-venda" description="Confirme um pagamento para gerar as automações." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Item comprado</th>
                  <th className="p-3 font-medium">Ação</th>
                  <th className="p-3 font-medium">Programado</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Nota NPS</th>
                  <th className="p-3 text-right font-medium">Reativação</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-medium">{p.cliente_nome}</td>
                    <td className="p-3 text-muted-foreground">{p.item_comprado}</td>
                    <td className="p-3">
                      <Badge tone={p.tipo_acao === 'lembrete_recompra' || p.tipo_acao === 'cupom_fidelidade' ? 'captacao' : 'pos'}>{ACOES_POS[p.tipo_acao]}</Badge>
                    </td>
                    <td className={cn('p-3', p.data_programada <= hoje && p.status === 'pendente' ? 'text-pos' : 'text-muted-foreground')}>{fmtDate(p.data_programada)}</td>
                    <td className="p-3">
                      <Badge tone={statusTone[p.status]} className="capitalize">{p.status}</Badge>
                    </td>
                    <td className="p-3">
                      {p.tipo_acao === 'pesquisa_nps' || p.tipo_acao === 'avaliacao_google' ? (
                        <>
                          <label className="sr-only" htmlFor={`nps-${p.id}`}>Simular nota NPS</label>
                          <Select
                            id={`nps-${p.id}`}
                            value={p.nota_nps ?? ''}
                            onChange={(e) => e.target.value !== '' && registrarNps(p.id, Number(e.target.value))}
                            className={cn('h-8 w-24 text-xs', p.nota_nps !== null && (p.nota_nps >= 9 ? 'text-vendas' : p.nota_nps >= 7 ? 'text-pos' : 'text-destructive'))}
                          >
                            <option value="">Simular</option>
                            {Array.from({ length: 11 }).map((_, n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </Select>
                        </>
                      ) : p.status === 'enviado' ? (
                        <Btn size="sm" variant="ghost" onClick={() => upsert('pos_venda_automacoes', { ...p, status: 'recomprou' })}>
                          Marcar recompra
                        </Btn>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Btn size="sm" tone="pos" onClick={() => dispararReativacao(p.id)} disabled={p.status === 'recomprou'}>
                        <Send /> Disparar Reativação via IA no WhatsApp
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
