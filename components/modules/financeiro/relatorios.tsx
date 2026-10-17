'use client'

import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Download } from 'lucide-react'
import { Btn, Card, Field, Select, Tabs } from '@/components/atendeai/ui'
import { calcularMes, extratoPorCategoria, fluxoDeCaixa, rotuloMesLongo, somarMeses } from '@/lib/financeiro'
import { brl } from '@/lib/format'
import { cn } from '@/lib/utils'
import { COR, baixarCsv, brlCurto, fmtPct, tooltipStyle, useFin } from './shared'

type Aba = 'dre' | 'fluxo' | 'extrato'

export function FinRelatorios() {
  const { ctx } = useFin()
  const [mes, setMes] = useState(ctx.mesAtual)
  const [aba, setAba] = useState<Aba>('dre')

  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => somarMeses(ctx.mesAtual, -i)), [ctx.mesAtual])
  const m = useMemo(() => calcularMes(ctx, mes), [ctx, mes])
  const fluxo = useMemo(() => fluxoDeCaixa(ctx, mes), [ctx, mes])
  const extrato = useMemo(() => extratoPorCategoria(ctx, mes), [ctx, mes])

  const margemDre = m.faturamento - m.imposto - m.custosVariaveis
  const linhasDre = [
    { rotulo: 'Receita bruta', valor: m.faturamento, tipo: 'total' as const },
    { rotulo: '(-) Impostos', valor: -m.imposto, tipo: 'item' as const },
    { rotulo: '(-) Custos variáveis', valor: -m.custosVariaveis, tipo: 'item' as const, detalhe: `Aquisição ${brl(m.custoAquisicao)} · mão de obra ${brl(m.custoMaoObra)} · comissões ${brl(m.comissoes)} · outros ${brl(m.custoVariaveisExtra)}` },
    { rotulo: '= Margem de contribuição', valor: margemDre, tipo: 'total' as const, pct: m.faturamento > 0 ? margemDre / m.faturamento : null },
    { rotulo: '(-) Custos fixos', valor: -m.fixos, tipo: 'item' as const },
    { rotulo: '(-) Despesas avulsas', valor: -m.despesas, tipo: 'item' as const },
    { rotulo: '= Lucro líquido', valor: m.lucro, tipo: 'resultado' as const, pct: m.faturamento > 0 ? m.margemLiquida : null },
  ]

  const exportar = () => {
    const linhas: (string | number)[][] = [
      [`Relatório financeiro - ${rotuloMesLongo(mes)}`],
      [],
      ['DRE simplificado'],
      ['Linha', 'Valor (R$)'],
      ...linhasDre.map((l) => [l.rotulo, l.valor]),
      [],
      ['Extrato por categoria'],
      ['Grupo', 'Categoria', 'Valor (R$)'],
      ...extrato.map((e) => [e.grupo, e.categoria, e.valor]),
      [],
      ['Fluxo de caixa diário'],
      ['Dia', 'Entradas', 'Custos variáveis', 'Impostos', 'Fixos', 'Despesas', 'Saldo do dia', 'Saldo acumulado'],
      ...fluxo.map((d) => [d.data, d.entradas, d.custosVariaveis, d.impostos, d.fixos, d.despesas, d.saldoDia, d.saldoAcumulado]),
    ]
    baixarCsv(`financeiro-${mes}.csv`, linhas)
  }

  const grupos = ['Receitas', 'Custos variáveis', 'Impostos', 'Custos fixos', 'Despesas'] as const

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Mês de referência">
            <Select value={mes} onChange={(e) => setMes(e.target.value)} className="w-52 capitalize">
              {meses.map((x) => (
                <option key={x} value={x}>
                  {rotuloMesLongo(x)}
                </option>
              ))}
            </Select>
          </Field>
          <Tabs
            value={aba}
            onChange={setAba}
            items={[
              { value: 'dre', label: 'DRE' },
              { value: 'fluxo', label: 'Fluxo de caixa' },
              { value: 'extrato', label: 'Extrato' },
            ]}
          />
        </div>
        <Btn variant="outline" onClick={exportar}>
          <Download /> Exportar CSV
        </Btn>
      </div>

      {aba === 'dre' && (
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5">
            <h2 className="font-medium">DRE simplificado</h2>
            <p className="text-sm capitalize text-muted-foreground">{rotuloMesLongo(mes)}</p>
          </div>
          <ul className="divide-y divide-border">
            {linhasDre.map((l) => (
              <li key={l.rotulo} className={cn('flex flex-col gap-0.5 px-5 py-3', l.tipo === 'resultado' && 'bg-secondary/60')}>
                <div className="flex items-center justify-between gap-4">
                  <span className={cn('text-sm', l.tipo !== 'item' && 'font-semibold')}>{l.rotulo}</span>
                  <span className="flex items-baseline gap-3">
                    {l.pct != null && <span className="text-xs text-muted-foreground">{fmtPct(l.pct)}</span>}
                    <span className={cn('font-medium tabular-nums', l.tipo === 'resultado' ? (l.valor >= 0 ? 'text-vendas' : 'text-destructive') : l.valor < 0 ? 'text-muted-foreground' : '')}>{brl(l.valor)}</span>
                  </span>
                </div>
                {l.detalhe && <span className="text-xs text-muted-foreground">{l.detalhe}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {aba === 'fluxo' && (
        <Card className="flex flex-col gap-4 p-5">
          <div>
            <h2 className="font-medium">Fluxo de caixa dia a dia</h2>
            <p className="text-sm text-muted-foreground">Entradas pelas vendas; saídas por custos variáveis, impostos, fixos (no dia do vencimento) e despesas.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={fluxo} margin={{ left: -8, right: 8, top: 8 }}>
                <CartesianGrid stroke="#1F2937" vertical={false} />
                <XAxis dataKey="dia" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={brlCurto} tickLine={false} axisLine={false} width={56} />
                <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} labelFormatter={(d) => `Dia ${d}`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill={COR.lucro} radius={[3, 3, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill={COR.prejuizo} radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="saldoAcumulado" name="Saldo acumulado" stroke={COR.info} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Dia</th>
                  <th className="px-3 py-2 text-right font-medium">Entradas</th>
                  <th className="px-3 py-2 text-right font-medium">Saídas</th>
                  <th className="px-3 py-2 text-right font-medium">Saldo do dia</th>
                  <th className="px-3 py-2 text-right font-medium">Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {fluxo.map((d) => (
                  <tr key={d.data} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">{d.dia}</td>
                    <td className="px-3 py-2 text-right text-vendas">{d.entradas ? brl(d.entradas) : '—'}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">{d.saidas ? brl(d.saidas) : '—'}</td>
                    <td className={cn('px-3 py-2 text-right', d.saldoDia < 0 && 'text-destructive')}>{brl(d.saldoDia)}</td>
                    <td className={cn('px-3 py-2 text-right font-medium', d.saldoAcumulado < 0 && 'text-destructive')}>{brl(d.saldoAcumulado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {aba === 'extrato' && (
        <div className="grid gap-4 md:grid-cols-2">
          {grupos.map((g) => {
            const linhas = extrato.filter((e) => e.grupo === g)
            const total = linhas.reduce((a, e) => a + e.valor, 0)
            return (
              <Card key={g} className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">{g}</h2>
                  <span className={cn('font-semibold', g === 'Receitas' ? 'text-vendas' : '')}>{brl(total)}</span>
                </div>
                {linhas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {linhas.map((e) => (
                      <li key={e.categoria} className="flex items-center justify-between py-2 text-sm">
                        <span className="text-muted-foreground">{e.categoria}</span>
                        <span className="tabular-nums">{brl(e.valor)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
