'use client'

import { Building2, Crown, Lock, LogIn, TrendingUp, Unlock, Users } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, PageHeader, Select, Stat } from '@/components/atendeai/ui'
import { brl, fmtDate } from '@/lib/format'
import type { Plano } from '@/lib/types'

const PRECO: Record<Plano, number> = { starter: 97, pro: 197, enterprise: 397 }
const LIMITES: Record<Plano, { f: number; m: number }> = {
  starter: { f: 2, m: 2000 },
  pro: { f: 5, m: 8000 },
  enterprise: { f: 10, m: 20000 },
}
const NOME: Record<Plano, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Full 360' }

export function Master() {
  const { allDb, empresa: atual, upsert, switchEmpresa, notify, definirStatusEmpresa } = useData()
  if (!allDb) return null
  const empresas = allDb.empresas
  const ativas = empresas.filter((e) => e.status === 'ativo')
  const mrr = ativas.reduce((s, e) => s + PRECO[e.plano], 0)
  const porPlano = (Object.keys(PRECO) as Plano[]).map((p) => ({ plano: NOME[p], empresas: empresas.filter((e) => e.plano === p).length, mrr: ativas.filter((e) => e.plano === p).length * PRECO[p] }))

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader eyebrow="Plataforma" tone="pos" title="Painel Master SaaS" description="Visão exclusiva do dono da plataforma: assinantes, planos e receita recorrente." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={brl(mrr)} hint={`ARR ${brl(mrr * 12)}`} tone="vendas" icon={<TrendingUp />} />
        <Stat label="Empresas assinantes" value={empresas.length} hint={`${ativas.length} ativas`} tone="captacao" icon={<Building2 />} />
        <Stat label="Usuários na plataforma" value={allDb.perfis.length} tone="ia" icon={<Users />} />
        <Stat label="Ticket médio" value={brl(ativas.length ? mrr / ativas.length : 0)} tone="pos" icon={<Crown />} />
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">MRR por plano</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porPlano} margin={{ left: -10 }}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis dataKey="plano" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, color: '#F9FAFB', fontSize: 12 }} cursor={{ fill: '#1F2937' }} formatter={(v) => brl(Number(v))} />
              <Bar dataKey="mrr" name="MRR" fill="#F59E0B" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Empresa</th>
              <th className="p-3 font-medium">Segmento</th>
              <th className="p-3 font-medium">Plano</th>
              <th className="p-3 font-medium">Limites</th>
              <th className="p-3 font-medium">Desde</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="p-3">
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {e.nome} {e.id === atual.id && <Badge tone="captacao" className="ml-1">Atual</Badge>}
                    </span>
                    <span className="text-xs text-muted-foreground">{e.cnpj || 'CNPJ não informado'}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground">{e.segmento}</td>
                <td className="p-3">
                  <label className="sr-only" htmlFor={`plano-${e.id}`}>Plano</label>
                  <Select
                    id={`plano-${e.id}`}
                    value={e.plano}
                    onChange={(ev) => {
                      const plano = ev.target.value as Plano
                      upsert('empresas', { ...e, plano, limite_funcionarios: LIMITES[plano].f, limite_mensagens_ia: LIMITES[plano].m })
                      notify({ title: `Plano alterado para ${NOME[plano]}`, description: e.nome, tone: 'pos' })
                    }}
                    className="h-8 w-32 text-xs"
                  >
                    {(Object.keys(PRECO) as Plano[]).map((p) => (
                      <option key={p} value={p}>
                        {NOME[p]} · R$ {PRECO[p]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {e.limite_funcionarios} IAs · {e.limite_mensagens_ia.toLocaleString('pt-BR')} msgs
                </td>
                <td className="p-3 text-muted-foreground">{fmtDate(e.created_at)}</td>
                <td className="p-3">
                  <Badge tone={e.status === 'ativo' ? 'vendas' : e.status === 'pendente' ? 'pos' : 'erro'}>
                    {e.status === 'ativo' ? 'Ativo' : e.status === 'pendente' ? 'Aguardando aprovação' : 'Suspenso'}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    {e.status === 'pendente' ? (
                      <Btn size="sm" tone="vendas" onClick={() => definirStatusEmpresa(e.id, 'ativo')}>
                        <Unlock /> Aprovar
                      </Btn>
                    ) : (
                      <Btn size="sm" variant="ghost" onClick={() => definirStatusEmpresa(e.id, e.status === 'ativo' ? 'suspenso' : 'ativo')} disabled={e.id === atual.id && e.status === 'ativo'}>
                        {e.status === 'ativo' ? <Lock /> : <Unlock />} {e.status === 'ativo' ? 'Suspender' : 'Reativar'}
                      </Btn>
                    )}
                    <Btn size="sm" variant="outline" onClick={() => switchEmpresa(e.id)} disabled={e.id === atual.id || e.status !== 'ativo'}>
                      <LogIn /> Acessar
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
