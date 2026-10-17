'use client'

import { useMemo } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, OctagonAlert, Receipt, Target, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { Badge, Btn, Card, Empty, Stat } from '@/components/atendeai/ui'
import {
  analisarProdutos,
  calcularMes,
  fixosPorCategoria,
  gerarAlertas,
  movimentacoes,
  pontoEquilibrio,
  rotuloMes,
  serieDiaria,
  serieMensal,
  somarMeses,
} from '@/lib/financeiro'
import { brl, fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AnimatedBrl, COR, PALETA, brlCurto, fmtPct, tooltipStyle, useFin } from './shared'

const nivelTone = { critico: 'erro', atencao: 'pos', info: 'captacao' } as const
const nivelIcon = { critico: OctagonAlert, atencao: AlertTriangle, info: Info } as const

export function FinDashboard() {
  const { ctx, db, setFinAba, goModule } = useFin()

  const m = useMemo(() => calcularMes(ctx, ctx.mesAtual), [ctx])
  const anterior = useMemo(() => calcularMes(ctx, somarMeses(ctx.mesAtual, -1)), [ctx])
  const eq = useMemo(() => pontoEquilibrio(ctx, m), [ctx, m])
  const diaria = useMemo(() => serieDiaria(ctx, 30), [ctx])
  const mensal = useMemo(
    () =>
      serieMensal(ctx, 6).map((x) => ({
        mes: rotuloMes(x.mes),
        Custos: Math.round(x.custosTotais),
        Despesas: Math.round(x.despesas),
        Impostos: Math.round(x.imposto),
        Lucro: Math.max(0, Math.round(x.lucro)),
      })),
    [ctx],
  )
  const fixosCat = useMemo(() => [...fixosPorCategoria(ctx).entries()].map(([nome, valor]) => ({ nome, valor: Math.round(valor) })).filter((x) => x.valor > 0), [ctx])
  const produtos = useMemo(() => analisarProdutos(ctx).filter((l) => l.item.ativo), [ctx])
  const top = useMemo(() => {
    const ord = [...produtos].sort((a, b) => b.lucro90 - a.lucro90)
    return {
      melhores: ord.slice(0, 5).map((l) => ({ nome: l.item.nome, lucro: Math.round(l.lucro90) })),
      piores: [...ord].reverse().slice(0, 5).map((l) => ({ nome: l.item.nome, lucro: Math.round(l.lucro90) })),
    }
  }, [produtos])
  const movs = useMemo(() => movimentacoes(ctx, 8), [ctx])
  const alertas = useMemo(() => gerarAlertas(ctx, db, m), [ctx, db, m])

  const variacao = anterior.faturamento > 0 ? m.faturamento / anterior.faturamento - 1 : null
  const lucroTone = m.lucro >= 0 ? 'vendas' : 'erro'
  const semDados = ctx.receitas.length === 0

  if (semDados && !ctx.fixos.length)
    return (
      <Card>
        <Empty
          icon={<Wallet />}
          title="Ainda não há dados financeiros"
          description="Cadastre seus custos fixos e registre vendas pagas: o painel se monta sozinho."
        />
      </Card>
    )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Faturamento do mês"
          value={<AnimatedBrl value={m.faturamento} />}
          tone="vendas"
          icon={<Wallet />}
          hint={variacao === null ? 'Sem mês anterior para comparar' : `${variacao >= 0 ? '+' : ''}${fmtPct(variacao)} vs mês anterior`}
        />
        <Stat label="Custos totais" value={<AnimatedBrl value={m.custosTotais} />} tone="pos" icon={<Receipt />} hint={`Variáveis ${brl(m.custosVariaveis)} · fixos ${brl(m.fixos)}`} />
        <Stat label="Despesas avulsas" value={<AnimatedBrl value={m.despesas} />} tone="neutral" icon={<Receipt />} hint={m.despesasPendentes > 0 ? `${brl(m.despesasPendentes)} a pagar` : 'Tudo pago'} />
        <Stat label="Impostos provisionados" value={<AnimatedBrl value={m.imposto} />} tone="captacao" icon={<Receipt />} hint={ctx.mei ? 'DAS fixo do MEI' : `Alíquota efetiva de ${(ctx.aliq * 100).toFixed(2).replace('.', ',')}%`} />
        <Stat
          label="Lucro líquido"
          value={<span className={m.lucro >= 0 ? 'text-vendas' : 'text-destructive'}><AnimatedBrl value={m.lucro} /></span>}
          tone={lucroTone}
          icon={m.lucro >= 0 ? <TrendingUp /> : <TrendingDown />}
          hint={m.lucro >= 0 ? 'Resultado positivo' : 'Resultado negativo no mês'}
        />
        <Stat label="Margem líquida" value={fmtPct(m.margemLiquida)} tone={m.margemLiquida >= 0.15 ? 'vendas' : m.margemLiquida >= 0 ? 'pos' : 'erro'} icon={<Target />} hint="Lucro ÷ faturamento" />
        <Stat label="Ticket médio" value={<AnimatedBrl value={m.ticket} />} tone="ia" icon={<Receipt />} hint={`${m.vendas} venda${m.vendas === 1 ? '' : 's'} no mês`} />
        <Stat
          label="Ponto de equilíbrio"
          value={eq.atingido ? 'Atingido' : brl(eq.falta)}
          tone={eq.atingido ? 'vendas' : 'pos'}
          icon={<Target />}
          hint={eq.atingido ? `Mínimo do mês: ${brl(eq.necessario)}` : `Faltam para cobrir ${brl(eq.necessario)}`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Faturamento diário (30 dias)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diaria} margin={{ left: -8, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COR.lucro} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={COR.lucro} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fill: '#9CA3AF', fontSize: 11 }} interval={4} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={brlCurto} tickLine={false} axisLine={false} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
                <Area type="monotone" dataKey="valor" name="Faturamento" stroke={COR.lucro} strokeWidth={2} fill="url(#gFat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Composição: onde vai cada real (6 meses)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mensal} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="mes" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={brlCurto} tickLine={false} axisLine={false} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Custos" stackId="a" fill={COR.atencao} />
                <Bar dataKey="Despesas" stackId="a" fill={COR.neutro} />
                <Bar dataKey="Impostos" stackId="a" fill={COR.info} />
                <Bar dataKey="Lucro" stackId="a" fill={COR.lucro} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Custos fixos por categoria (mensal)</h2>
          {fixosCat.length === 0 ? (
            <Empty icon={<Receipt />} title="Nenhum custo fixo cadastrado" description="Cadastre em Custos & Despesas." />
          ) : (
            <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto]">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fixosCat} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
                      {fixosCat.map((_, i) => (
                        <Cell key={i} fill={PALETA[i % PALETA.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm">
                {fixosCat.map((c, i) => (
                  <li key={c.nome} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: PALETA[i % PALETA.length] }} />
                    <span className="text-muted-foreground">{c.nome}</span>
                    <span className="ml-auto pl-4 font-medium">{brl(c.valor)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Lucro por item nos últimos 90 dias</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { titulo: '5 mais lucrativos', dados: top.melhores, cor: COR.lucro },
              { titulo: '5 menos lucrativos', dados: top.piores, cor: COR.prejuizo },
            ].map((g) => (
              <div key={g.titulo} className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{g.titulo}</span>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={g.dados} layout="vertical" margin={{ left: 0, right: 12 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="nome" width={92} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                      <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
                      <Bar dataKey="lucro" name="Lucro 90d" fill={g.cor} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Últimas movimentações</h2>
          {movs.length === 0 ? (
            <Empty icon={<Wallet />} title="Sem movimentações ainda" />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {movs.map((x) => (
                <li key={x.id} className="flex items-center gap-3 py-2.5">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', x.tipo === 'receita' ? 'bg-vendas/10 text-vendas' : 'bg-destructive/10 text-destructive')}>
                    {x.tipo === 'receita' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{x.descricao}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmtDate(x.data)} · {x.categoria}
                      {!x.pago && x.tipo === 'despesa' ? ' · a pagar' : ''}
                    </span>
                  </div>
                  <span className={cn('text-sm font-semibold', x.tipo === 'receita' ? 'text-vendas' : 'text-destructive')}>
                    {x.tipo === 'receita' ? '+' : '-'} {brl(x.valor)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Alertas</h2>
            <Badge tone={alertas.some((a) => a.nivel === 'critico') ? 'erro' : 'neutral'}>{alertas.length}</Badge>
          </div>
          {alertas.length === 0 ? (
            <Empty icon={<Target />} title="Tudo em ordem" description="Nenhum alerta financeiro no momento." />
          ) : (
            <ul className="flex flex-col gap-2">
              {alertas.map((a) => {
                const Icon = nivelIcon[a.nivel]
                return (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                    <Badge tone={nivelTone[a.nivel]} className="mt-0.5 px-1.5">
                      <Icon className="size-3.5" />
                    </Badge>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{a.titulo}</span>
                      <span className="text-xs leading-relaxed text-muted-foreground">{a.detalhe}</span>
                    </div>
                    {a.aba && (
                      <Btn size="sm" variant="outline" onClick={() => setFinAba(a.aba!)}>
                        Ver
                      </Btn>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          <Btn size="sm" variant="ghost" className="self-start" onClick={() => goModule('radar')}>
            Abrir Radar de Oportunidades
          </Btn>
        </Card>
      </div>
    </div>
  )
}
