'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Pencil, Plus, Receipt, Trash2 } from 'lucide-react'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Select, Stat, Switch, Tabs } from '@/components/atendeai/ui'
import { CATEGORIAS, mensalizar } from '@/lib/financeiro'
import { brl, fmtDate, isoDate, nowIso, uid } from '@/lib/format'
import type { CategoriaFinanceira, CustoFixo, CustoVariavel, Despesa, FormaPagamentoDespesa, RecorrenciaCusto } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useFin } from './shared'

const FORMAS: Record<FormaPagamentoDespesa, string> = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
}
const RECORRENCIA: Record<RecorrenciaCusto, string> = { mensal: 'Mensal', trimestral: 'Trimestral', anual: 'Anual' }

const paraNumero = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

type Aba = 'fixos' | 'variaveis' | 'despesas'

export function FinCustos() {
  const [aba, setAba] = useState<Aba>('fixos')
  return (
    <div className="flex flex-col gap-4">
      <Tabs
        value={aba}
        onChange={setAba}
        items={[
          { value: 'fixos', label: 'Custos fixos' },
          { value: 'variaveis', label: 'Custos variáveis' },
          { value: 'despesas', label: 'Despesas avulsas' },
        ]}
      />
      {aba === 'fixos' && <Fixos />}
      {aba === 'variaveis' && <Variaveis />}
      {aba === 'despesas' && <Despesas />}
    </div>
  )
}

function Acoes({ onEdit, onDelete, nome }: { onEdit: () => void; onDelete: () => void; nome: string }) {
  return (
    <div className="flex justify-end gap-1">
      <Btn size="sm" variant="ghost" onClick={onEdit} aria-label={`Editar ${nome}`}>
        <Pencil />
      </Btn>
      <Btn size="sm" variant="ghost" onClick={onDelete} aria-label={`Excluir ${nome}`} className="hover:text-destructive">
        <Trash2 />
      </Btn>
    </div>
  )
}

// ---------------- Custos fixos ----------------
function Fixos() {
  const { db, empresa, upsert, remove, notify } = useFin()
  const [form, setForm] = useState<CustoFixo | null>(null)
  const total = db.financeiro_custos_fixos.filter((f) => f.ativo).reduce((a, f) => a + mensalizar(f), 0)

  const novo = (): CustoFixo => ({ id: uid(), empresa_id: empresa.id, descricao: '', categoria: 'Estrutura', valor: 0, recorrencia: 'mensal', dia_vencimento: 5, ativo: true, created_at: nowIso() })

  const excluir = (f: CustoFixo) => {
    if (!window.confirm(`Excluir o custo fixo "${f.descricao}"?`)) return
    remove('financeiro_custos_fixos', f.id, `Excluiu custo fixo ${f.descricao}`)
    notify('Custo fixo excluído.')
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total mensal dos custos fixos" value={brl(total)} tone="pos" icon={<Receipt />} hint="Anuais e trimestrais já divididos por mês" />
        <Stat label="Itens ativos" value={db.financeiro_custos_fixos.filter((f) => f.ativo).length} tone="neutral" />
        <div className="flex items-center sm:justify-end">
          <Btn onClick={() => setForm(novo())}>
            <Plus /> Novo custo fixo
          </Btn>
        </div>
      </div>
      <Card className="overflow-hidden">
        {db.financeiro_custos_fixos.length === 0 ? (
          <Empty icon={<Receipt />} title="Nenhum custo fixo" description="Aluguel, salários, internet, contador: tudo que você paga todo mês." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Recorrência</th>
                  <th className="px-4 py-3 font-medium">Vence dia</th>
                  <th className="px-4 py-3 text-right font-medium">Por mês</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {db.financeiro_custos_fixos.map((f) => (
                  <tr key={f.id} className={cn('border-b border-border/60 last:border-0', !f.ativo && 'opacity-50')}>
                    <td className="px-4 py-3 font-medium">{f.descricao}</td>
                    <td className="px-4 py-3">
                      <Badge>{f.categoria}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{brl(f.valor)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{RECORRENCIA[f.recorrencia]}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.dia_vencimento}</td>
                    <td className="px-4 py-3 text-right font-medium">{brl(mensalizar(f))}</td>
                    <td className="px-4 py-3">
                      <Acoes nome={f.descricao} onEdit={() => setForm(f)} onDelete={() => excluir(f)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form && db.financeiro_custos_fixos.some((x) => x.id === form.id) ? 'Editar custo fixo' : 'Novo custo fixo'}>
        {form && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.descricao.trim() || form.valor <= 0) return notify('Informe a descrição e um valor maior que zero.')
              upsert('financeiro_custos_fixos', { ...form, descricao: form.descricao.trim() }, `Salvou custo fixo ${form.descricao}`)
              notify('Custo fixo salvo.')
              setForm(null)
            }}
          >
            <Field label="Descrição">
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Aluguel do espaço" autoFocus />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria">
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaFinanceira })}>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Valor (R$)">
                <Input inputMode="decimal" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: paraNumero(e.target.value) })} />
              </Field>
              <Field label="Recorrência">
                <Select value={form.recorrencia} onChange={(e) => setForm({ ...form, recorrencia: e.target.value as RecorrenciaCusto })}>
                  {Object.entries(RECORRENCIA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dia do vencimento">
                <Input type="number" min={1} max={31} value={form.dia_vencimento} onChange={(e) => setForm({ ...form, dia_vencimento: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} />
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">Custo ativo</span>
              <Switch checked={form.ativo} onChange={(v) => setForm({ ...form, ativo: v })} label="Custo ativo" />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>
                Cancelar
              </Btn>
              <Btn type="submit">Salvar</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

// ---------------- Custos variáveis ----------------
function Variaveis() {
  const { db, empresa, upsert, remove, notify } = useFin()
  const [form, setForm] = useState<CustoVariavel | null>(null)
  const nomeItem = (id: string | null) => (id ? db.catalogo.find((c) => c.id === id)?.nome ?? 'Item removido' : 'Todos os itens')
  const novo = (): CustoVariavel => ({ id: uid(), empresa_id: empresa.id, descricao: '', tipo: 'percentual', valor: 0, catalogo_id: null, ativo: true, created_at: nowIso() })

  const excluir = (v: CustoVariavel) => {
    if (!window.confirm(`Excluir o custo variável "${v.descricao}"?`)) return
    remove('financeiro_custos_variaveis', v.id, `Excluiu custo variável ${v.descricao}`)
    notify('Custo variável excluído.')
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Custos que crescem junto com as vendas, como taxa de maquininha ou embalagem. Eles entram automaticamente na margem de cada item.</p>
        <Btn onClick={() => setForm(novo())}>
          <Plus /> Novo custo variável
        </Btn>
      </div>
      <Card className="overflow-hidden">
        {db.financeiro_custos_variaveis.length === 0 ? (
          <Empty icon={<Receipt />} title="Nenhum custo variável" description="Cadastre taxas e insumos que mudam a cada venda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Aplica a</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {db.financeiro_custos_variaveis.map((v) => (
                  <tr key={v.id} className={cn('border-b border-border/60 last:border-0', !v.ativo && 'opacity-50')}>
                    <td className="px-4 py-3 font-medium">{v.descricao}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.tipo === 'percentual' ? 'Percentual' : 'Valor fixo'}</td>
                    <td className="px-4 py-3 text-right">{v.tipo === 'percentual' ? `${v.valor.toString().replace('.', ',')}%` : brl(v.valor)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{nomeItem(v.catalogo_id)}</td>
                    <td className="px-4 py-3">
                      <Acoes nome={v.descricao} onEdit={() => setForm(v)} onDelete={() => excluir(v)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form && db.financeiro_custos_variaveis.some((x) => x.id === form.id) ? 'Editar custo variável' : 'Novo custo variável'}>
        {form && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.descricao.trim() || form.valor <= 0) return notify('Informe a descrição e um valor maior que zero.')
              if (form.tipo === 'percentual' && form.valor >= 100) return notify('O percentual precisa ser menor que 100%.')
              upsert('financeiro_custos_variaveis', { ...form, descricao: form.descricao.trim() }, `Salvou custo variável ${form.descricao}`)
              notify('Custo variável salvo.')
              setForm(null)
            }}
          >
            <Field label="Descrição">
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Taxa da maquininha" autoFocus />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo">
                <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as CustoVariavel['tipo'] })}>
                  <option value="percentual">Percentual da venda (%)</option>
                  <option value="valor">Valor fixo por venda (R$)</option>
                </Select>
              </Field>
              <Field label={form.tipo === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}>
                <Input inputMode="decimal" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: paraNumero(e.target.value) })} />
              </Field>
            </div>
            <Field label="Aplica a">
              <Select value={form.catalogo_id ?? ''} onChange={(e) => setForm({ ...form, catalogo_id: e.target.value || null })}>
                <option value="">Todos os itens do catálogo</option>
                {db.catalogo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">Custo ativo</span>
              <Switch checked={form.ativo} onChange={(v) => setForm({ ...form, ativo: v })} label="Custo ativo" />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>
                Cancelar
              </Btn>
              <Btn type="submit">Salvar</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

// ---------------- Despesas avulsas ----------------
function Despesas() {
  const { db, empresa, upsert, remove, notify } = useFin()
  const [form, setForm] = useState<Despesa | null>(null)
  const lista = [...db.financeiro_despesas].sort((a, b) => b.data.localeCompare(a.data))
  const pendente = lista.filter((d) => !d.pago).reduce((a, d) => a + d.valor, 0)
  const hoje = isoDate(new Date())
  const novo = (): Despesa => ({ id: uid(), empresa_id: empresa.id, descricao: '', categoria: 'Outros', valor: 0, data: hoje, pago: true, forma_pagamento: 'pix', created_at: nowIso() })

  const excluir = (d: Despesa) => {
    if (!window.confirm(`Excluir a despesa "${d.descricao}"?`)) return
    remove('financeiro_despesas', d.id, `Excluiu despesa ${d.descricao}`)
    notify('Despesa excluída.')
  }
  const marcarPaga = (d: Despesa) => {
    upsert('financeiro_despesas', { ...d, pago: !d.pago }, `${d.pago ? 'Reabriu' : 'Pagou'} a despesa ${d.descricao}`)
    notify(d.pago ? 'Despesa marcada como a pagar.' : 'Despesa marcada como paga.')
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Despesas cadastradas" value={lista.length} tone="neutral" icon={<Receipt />} />
        <Stat label="A pagar" value={brl(pendente)} tone={pendente > 0 ? 'pos' : 'vendas'} icon={<Clock />} hint={pendente > 0 ? 'Despesas ainda não pagas' : 'Nada pendente'} />
        <div className="flex items-center sm:justify-end">
          <Btn onClick={() => setForm(novo())}>
            <Plus /> Nova despesa
          </Btn>
        </div>
      </div>
      <Card className="overflow-hidden">
        {lista.length === 0 ? (
          <Empty icon={<Receipt />} title="Nenhuma despesa avulsa" description="Compras e gastos pontuais que não se repetem todo mês." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => {
                  const vencida = !d.pago && d.data < hoje
                  return (
                    <tr key={d.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(d.data)}</td>
                      <td className="px-4 py-3 font-medium">{d.descricao}</td>
                      <td className="px-4 py-3">
                        <Badge>{d.categoria}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{FORMAS[d.forma_pagamento]}</td>
                      <td className="px-4 py-3 text-right">{brl(d.valor)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => marcarPaga(d)} aria-label={d.pago ? 'Marcar como a pagar' : 'Marcar como paga'}>
                          <Badge tone={d.pago ? 'vendas' : vencida ? 'erro' : 'pos'}>
                            {d.pago ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                            {d.pago ? 'Paga' : vencida ? 'Vencida' : 'A pagar'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Acoes nome={d.descricao} onEdit={() => setForm(d)} onDelete={() => excluir(d)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={Boolean(form)} onClose={() => setForm(null)} title={form && db.financeiro_despesas.some((x) => x.id === form.id) ? 'Editar despesa' : 'Nova despesa'}>
        {form && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!form.descricao.trim() || form.valor <= 0 || !form.data) return notify('Informe descrição, data e um valor maior que zero.')
              upsert('financeiro_despesas', { ...form, descricao: form.descricao.trim() }, `Salvou despesa ${form.descricao}`)
              notify('Despesa salva.')
              setForm(null)
            }}
          >
            <Field label="Descrição">
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Manutenção do ar-condicionado" autoFocus />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria">
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaFinanceira })}>
                  {CATEGORIAS.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Valor (R$)">
                <Input inputMode="decimal" value={form.valor || ''} onChange={(e) => setForm({ ...form, valor: paraNumero(e.target.value) })} />
              </Field>
              <Field label="Data">
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </Field>
              <Field label="Forma de pagamento">
                <Select value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value as FormaPagamentoDespesa })}>
                  {Object.entries(FORMAS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm">Já foi paga</span>
              <Switch checked={form.pago} onChange={(v) => setForm({ ...form, pago: v })} label="Já foi paga" />
            </div>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>
                Cancelar
              </Btn>
              <Btn type="submit">Salvar</Btn>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
