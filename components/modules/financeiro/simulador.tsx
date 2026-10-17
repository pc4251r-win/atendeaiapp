'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts'
import { BadgeCheck, Calculator, Lock, Save, Scale, Target, TrendingUp, Trash2, Unlock } from 'lucide-react'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Stat, Tabs } from '@/components/atendeai/ui'
import {
  baseCenario,
  calcularMes,
  compararRegimes,
  curvaEquilibrio,
  diasNoMes,
  pontoEquilibrio,
  projetar,
  rotuloMesLongo,
  simularCenario,
} from '@/lib/financeiro'
import { brl, nowIso, uid } from '@/lib/format'
import type { SimulacaoParametros } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AnimatedBrl, COR, brlCurto, fmtNum, fmtPct, tooltipStyle, useFin } from './shared'

type Aba = 'equilibrio' | 'cenarios' | 'projecao' | 'regimes' | 'metas'

const paraNumero = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function FinSimulador() {
  const { ctx, salvarConfig, notify } = useFin()
  const [aba, setAba] = useState<Aba>('equilibrio')
  const [saberMais, setSaberMais] = useState(false)

  if (!ctx.cfg.simulador_ativo)
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card className="flex flex-col items-center gap-5 border-ia/30 p-8 text-center md:p-12">
          <span className="flex size-16 items-center justify-center rounded-2xl border border-ia/30 bg-ia/10 text-ia">
            <TrendingUp className="size-8" />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-balance text-2xl font-semibold tracking-tight">Planeje o futuro do seu negócio</h2>
            <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
              Simule cenários, descubra o ponto de equilíbrio, defina metas e projete seus próximos meses. Este recurso é opcional: ative quando quiser.
            </p>
          </div>
          <Btn
            size="lg"
            onClick={() => {
              salvarConfig({ simulador_ativo: true }, 'Ativou o Simulador & Projeções')
              notify('Simulador & Projeções ativado.')
            }}
          >
            <Unlock /> Ativar Simulador & Projeções
          </Btn>
          <button type="button" onClick={() => setSaberMais(true)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Saber mais
          </button>
        </Card>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Target, texto: 'Descubra quantas vendas você precisa por dia para não ter prejuízo' },
            { icon: Calculator, texto: 'Simule o impacto de aumentar preços ou reduzir custos' },
            { icon: TrendingUp, texto: 'Projete seu faturamento para os próximos 12 meses' },
          ].map(({ icon: Icon, texto }) => (
            <Card key={texto} className="flex items-start gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-ia/30 bg-ia/10 text-ia">
                <Icon className="size-4" />
              </span>
              <p className="text-sm leading-relaxed">{texto}</p>
            </Card>
          ))}
        </div>

        <Modal open={saberMais} onClose={() => setSaberMais(false)} title="O que tem no Simulador & Projeções">
          <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Ponto de equilíbrio:</strong> quanto faturar por mês e por dia para cobrir todos os custos.
            </li>
            <li>
              <strong className="text-foreground">Cenários:</strong> mexa em preço, custo e volume com controles deslizantes e veja o efeito no lucro. Salve os que gostar.
            </li>
            <li>
              <strong className="text-foreground">Projeção de 12 meses:</strong> três cenários (otimista, realista, pessimista) calculados a partir do seu histórico real.
            </li>
            <li>
              <strong className="text-foreground">Comparador de regimes:</strong> quanto de imposto você pagaria em MEI, Simples, Presumido e Real.
            </li>
            <li>
              <strong className="text-foreground">Metas:</strong> defina a meta do mês e acompanhe o progresso em tempo real.
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Você pode desativar quando quiser. Seus cenários e metas ficam guardados.</p>
        </Modal>
      </div>
    )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          value={aba}
          onChange={setAba}
          items={[
            { value: 'equilibrio', label: 'Ponto de equilíbrio' },
            { value: 'cenarios', label: 'Cenários' },
            { value: 'projecao', label: 'Projeção 12 meses' },
            { value: 'regimes', label: 'Regimes' },
            { value: 'metas', label: 'Metas' },
          ]}
        />
        <Btn
          variant="outline"
          size="sm"
          onClick={() => {
            if (!window.confirm('Desativar o Simulador & Projeções? Seus cenários e metas continuam salvos.')) return
            salvarConfig({ simulador_ativo: false }, 'Desativou o Simulador & Projeções')
            notify('Simulador desativado.')
          }}
        >
          <Lock /> Desativar Simulador
        </Btn>
      </div>
      {aba === 'equilibrio' && <Equilibrio />}
      {aba === 'cenarios' && <Cenarios />}
      {aba === 'projecao' && <Projecao />}
      {aba === 'regimes' && <Regimes />}
      {aba === 'metas' && <Metas />}
    </div>
  )
}

// ---------------- 8.1 Ponto de equilíbrio ----------------
function Equilibrio() {
  const { ctx } = useFin()
  const m = useMemo(() => calcularMes(ctx, ctx.mesAtual), [ctx])
  const eq = useMemo(() => pontoEquilibrio(ctx, m), [ctx, m])
  const base = useMemo(() => baseCenario(ctx), [ctx])
  const curva = useMemo(() => curvaEquilibrio(eq), [eq])
  const ticket = m.ticket || base.ticket
  const dias = diasNoMes(ctx.mesAtual)
  const vendasMes = ticket > 0 ? Math.ceil(eq.necessario / ticket) : null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Faturar por mês" value={<AnimatedBrl value={eq.necessario} />} tone="ia" icon={<Target />} hint={`Custos do mês: ${brl(eq.custosFixosTotais)}`} />
        <Stat label="Faturar por dia" value={<AnimatedBrl value={eq.necessario / dias} />} tone="ia" hint={`Considerando ${dias} dias no mês`} />
        <Stat label="Vendas por mês" value={vendasMes === null ? '—' : fmtNum(vendasMes)} tone="ia" hint={ticket > 0 ? `Ticket médio de ${brl(ticket)}` : 'Sem vendas para estimar o ticket'} />
        <Stat label="Vendas por dia" value={vendasMes === null ? '—' : (vendasMes / dias).toFixed(1).replace('.', ',')} tone="ia" hint={`Margem de contribuição de ${fmtPct(eq.margemContribuicao, 0)}`} />
      </div>
      <Card className="flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Receita x custo total</h2>
            <p className="text-xs text-muted-foreground">Onde as linhas se cruzam, você deixa de ter prejuízo.</p>
          </div>
          <Badge tone={eq.atingido ? 'vendas' : 'pos'}>{eq.atingido ? 'Equilíbrio atingido neste mês' : `Faltam ${brl(eq.falta)}`}</Badge>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curva} margin={{ left: -8, right: 12, top: 8 }}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis type="number" dataKey="receita" domain={[0, 'dataMax']} tickFormatter={brlCurto} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={brlCurto} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} labelFormatter={(v) => `Faturamento ${brl(Number(v))}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine x={eq.necessario} stroke={COR.simulador} strokeDasharray="4 4" label={{ value: 'Equilíbrio', fill: COR.simulador, fontSize: 11, position: 'insideTopRight' }} />
              <Line type="linear" dataKey="receita" name="Receita" stroke={COR.lucro} strokeWidth={2} dot={false} />
              <Line type="linear" dataKey="custo" name="Custo total" stroke={COR.prejuizo} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs leading-relaxed text-muted-foreground">Cálculo: custos fixos e despesas do mês ÷ margem de contribuição média dos últimos 90 dias.</p>
    </div>
  )
}

// ---------------- 8.2 Cenários ----------------
const PARAMS_ZERO: SimulacaoParametros = { aumento_preco: 0, reducao_custo: 0, aumento_volume: 0, meta_lucro: 0 }

function Controle({ label, valor, max, onChange }: { label: string; valor: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono text-ia">{valor}%</span>
      </span>
      <input type="range" min={0} max={max} step={1} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ia" />
    </label>
  )
}

function Cenarios() {
  const { ctx, db, empresa, upsert, remove, notify } = useFin()
  const base = useMemo(() => baseCenario(ctx), [ctx])
  const [p, setP] = useState<SimulacaoParametros>(PARAMS_ZERO)
  const [nome, setNome] = useState('')
  const r = useMemo(() => simularCenario(base, p), [base, p])

  const salvar = () => {
    const titulo = nome.trim() || `Cenário ${db.financeiro_simulacoes.length + 1}`
    upsert(
      'financeiro_simulacoes',
      { id: uid(), empresa_id: empresa.id, nome: titulo, parametros: p, resultado: { faturamento: r.faturamento, lucro: r.lucro, margem: r.margem }, created_at: nowIso() },
      `Salvou o cenário ${titulo}`,
    )
    setNome('')
    notify('Cenário salvo.')
  }

  if (base.meses === 0)
    return (
      <Card>
        <Empty icon={<Calculator />} title="Ainda não há vendas para simular" description="Registre algumas vendas pagas e volte aqui: os cenários partem da sua média real." />
      </Card>
    )

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="flex flex-col gap-5 p-5">
        <div>
          <h2 className="font-medium">E se...</h2>
          <p className="text-xs text-muted-foreground">Base: média dos últimos {base.meses} {base.meses === 1 ? 'mês' : 'meses'}.</p>
        </div>
        <Controle label="Aumentar o preço" valor={p.aumento_preco} max={100} onChange={(v) => setP({ ...p, aumento_preco: v })} />
        <Controle label="Reduzir os custos" valor={p.reducao_custo} max={100} onChange={(v) => setP({ ...p, reducao_custo: v })} />
        <Controle label="Aumentar o volume de vendas" valor={p.aumento_volume} max={200} onChange={(v) => setP({ ...p, aumento_volume: v })} />
        <Field label="Quero lucrar (R$ por mês)">
          <Input inputMode="decimal" value={p.meta_lucro || ''} onChange={(e) => setP({ ...p, meta_lucro: paraNumero(e.target.value) })} placeholder="Ex.: 5000" />
        </Field>
        <Btn variant="ghost" size="sm" className="self-start" onClick={() => setP(PARAMS_ZERO)}>
          Zerar controles
        </Btn>
      </Card>

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Faturamento mensal" value={<AnimatedBrl value={r.faturamento} />} tone="ia" hint={`Hoje: ${brl(base.faturamento)}`} />
          <Stat
            label="Lucro mensal"
            value={<span className={r.lucro >= 0 ? 'text-vendas' : 'text-destructive'}><AnimatedBrl value={r.lucro} /></span>}
            tone={r.lucro >= 0 ? 'vendas' : 'erro'}
            hint={`${r.deltaLucro >= 0 ? '+' : ''}${brl(r.deltaLucro)} vs hoje (${brl(r.lucroBase)})`}
          />
          <Stat label="Margem líquida" value={fmtPct(r.margem)} tone={r.margem >= 0.15 ? 'vendas' : r.margem >= 0 ? 'pos' : 'erro'} hint={`Hoje: ${fmtPct(r.margemBase)}`} />
        </div>

        {p.meta_lucro > 0 && (
          <Card className="flex flex-col gap-1 border-ia/30 bg-ia/5 p-5">
            <span className="text-sm text-muted-foreground">Para lucrar {brl(p.meta_lucro)} por mês, você precisa de</span>
            {r.faturamentoNecessario === null ? (
              <p className="text-sm">Com estes parâmetros a margem não cobre os custos fixos. Aumente o preço ou reduza custos.</p>
            ) : (
              <p className="text-xl font-semibold">
                {brl(r.faturamentoNecessario)} de faturamento
                {r.vendasNecessarias !== null && <span className="text-base font-normal text-muted-foreground"> · cerca de {fmtNum(r.vendasNecessarias)} vendas/mês</span>}
              </p>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Salvar este cenário</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: Reajuste de 10%)" aria-label="Nome do cenário" />
            <Btn tone="ia" onClick={salvar}>
              <Save /> Salvar cenário
            </Btn>
          </div>
          {db.financeiro_simulacoes.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {db.financeiro_simulacoes.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{s.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      Preço +{s.parametros.aumento_preco}% · custo -{s.parametros.reducao_custo}% · volume +{s.parametros.aumento_volume}% → lucro {brl(s.resultado.lucro)}
                    </span>
                  </div>
                  <Btn size="sm" variant="outline" onClick={() => setP(s.parametros)}>
                    Abrir
                  </Btn>
                  <Btn size="sm" variant="ghost" aria-label={`Excluir ${s.nome}`} className="hover:text-destructive" onClick={() => remove('financeiro_simulacoes', s.id, `Excluiu o cenário ${s.nome}`)}>
                    <Trash2 />
                  </Btn>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ---------------- 8.3 Projeção ----------------
function Projecao() {
  const { ctx } = useFin()
  const proj = useMemo(() => projetar(ctx), [ctx])
  return (
    <div className="flex flex-col gap-4">
      {!proj.suficiente && (
        <Card className="border-pos/30 bg-pos/5 p-4">
          <p className="text-sm leading-relaxed">
            Ainda há poucos dados ({proj.mesesHistorico} {proj.mesesHistorico === 1 ? 'mês' : 'meses'} de histórico). A projeção abaixo é uma estimativa simples; preencha mais alguns meses de vendas para ganhar precisão.
          </p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Faturamento projetado (12 meses)" value={<AnimatedBrl value={proj.faturamentoRealista12} />} tone="ia" icon={<TrendingUp />} hint="Cenário realista" />
        <Stat label="Lucro projetado (12 meses)" value={<span className={proj.lucroRealista12 >= 0 ? 'text-vendas' : 'text-destructive'}><AnimatedBrl value={proj.lucroRealista12} /></span>} tone={proj.lucroRealista12 >= 0 ? 'vendas' : 'erro'} hint={`Margem média de ${fmtPct(proj.margemMedia, 0)}`} />
        <Stat label="Crescimento mensal" value={`${proj.crescimentoMensal >= 0 ? '+' : ''}${fmtPct(proj.crescimentoMensal)}`} tone="ia" hint={proj.sazonalidade ? 'Com ajuste de sazonalidade' : 'Sem sazonalidade (histórico curto)'} />
      </div>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-medium">Faturamento: real e projetado</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={proj.pontos} margin={{ left: -8, right: 12, top: 8 }}>
              <CartesianGrid stroke="#1F2937" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
              <YAxis tickFormatter={brlCurto} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip {...tooltipStyle} formatter={(v) => brl(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="real" name="Real" stroke="#F9FAFB" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey="otimista" name="Otimista" stroke={COR.lucro} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="realista" name="Realista" stroke={COR.simulador} strokeWidth={2.5} dot={false} connectNulls />
              <Line type="monotone" dataKey="pessimista" name="Pessimista" stroke={COR.prejuizo} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}

// ---------------- 8.4 Regimes ----------------
function Regimes() {
  const { ctx } = useFin()
  const base = useMemo(() => baseCenario(ctx), [ctx])
  const linhas = useMemo(() => compararRegimes(ctx, base), [ctx, base])
  const faturamentoAnual = (base.faturamento || ctx.cfg.faturamento_estimado) * 12
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Imposto estimado para um faturamento de {brl(faturamentoAnual)} por ano ({brl(faturamentoAnual / 12)} por mês). Valores aproximados; confirme com seu contador antes de mudar de regime.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {linhas.map((l) => (
          <Card key={l.regime} className={cn('flex flex-col gap-3 p-5', l.recomendado && 'border-vendas/50', !l.elegivel && 'opacity-60')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-medium">
                <Scale className="size-4 text-ia" /> {l.nome}
              </h3>
              <div className="flex gap-1.5">
                {l.atual && <Badge tone="captacao">Regime atual</Badge>}
                {l.recomendado && (
                  <Badge tone="vendas">
                    <BadgeCheck className="size-3" /> Recomendado
                  </Badge>
                )}
                {!l.elegivel && <Badge tone="erro">Não elegível</Badge>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">Por mês</span>
                <p className="font-semibold">{brl(l.impostoMensal)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Por ano</span>
                <p className="font-semibold">{brl(l.impostoAnual)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Alíquota</span>
                <p className="font-semibold">{l.aliquota.toFixed(2).replace('.', ',')}%</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{l.nota}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ---------------- 8.5 Metas ----------------
function Barra({ rotulo, atual, meta, bom }: { rotulo: string; atual: number; meta: number; bom: boolean }) {
  const pct = meta > 0 ? Math.max(0, atual / meta) : 0
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span>{rotulo}</span>
        <span className="flex items-center gap-2">
          {bom && (
            <Badge tone="vendas">
              <BadgeCheck className="size-3" /> Meta batida
            </Badge>
          )}
          <span className="text-muted-foreground">
            {brl(atual)} de {brl(meta)}
          </span>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(Math.min(1, pct) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
        <div className={cn('h-full rounded-full transition-[width] duration-700', bom ? 'bg-vendas' : 'bg-ia')} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{fmtPct(pct, 0)} da meta</span>
    </div>
  )
}

function Metas() {
  const { ctx, db, empresa, upsert, notify } = useFin()
  const m = useMemo(() => calcularMes(ctx, ctx.mesAtual), [ctx])
  const meta = db.financeiro_metas.find((x) => x.mes === ctx.mesAtual)
  const [fat, setFat] = useState(meta ? String(meta.meta_faturamento) : '')
  const [lucro, setLucro] = useState(meta ? String(meta.meta_lucro) : '')

  const salvar = () => {
    const mf = paraNumero(fat)
    const ml = paraNumero(lucro)
    if (mf <= 0) return notify('Informe a meta de faturamento do mês.')
    upsert('financeiro_metas', { id: meta?.id ?? uid(), empresa_id: empresa.id, mes: ctx.mesAtual, meta_faturamento: mf, meta_lucro: ml, created_at: meta?.created_at ?? nowIso() }, `Definiu a meta de ${rotuloMesLongo(ctx.mesAtual)}`)
    notify('Meta salva.')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-medium">Meta de {rotuloMesLongo(ctx.mesAtual)}</h2>
          <p className="text-xs text-muted-foreground">O progresso é calculado em tempo real com as vendas pagas.</p>
        </div>
        <Field label="Meta de faturamento (R$)">
          <Input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="Ex.: 12000" />
        </Field>
        <Field label="Meta de lucro (R$)">
          <Input inputMode="decimal" value={lucro} onChange={(e) => setLucro(e.target.value)} placeholder="Ex.: 2500" />
        </Field>
        <Btn tone="ia" onClick={salvar}>
          <Save /> Salvar meta
        </Btn>
      </Card>
      <Card className="flex flex-col gap-6 p-5">
        {meta ? (
          <>
            <Barra rotulo="Faturamento" atual={m.faturamento} meta={meta.meta_faturamento} bom={m.faturamento >= meta.meta_faturamento} />
            {meta.meta_lucro > 0 && <Barra rotulo="Lucro líquido" atual={m.lucro} meta={meta.meta_lucro} bom={m.lucro >= meta.meta_lucro} />}
          </>
        ) : (
          <Empty icon={<Target />} title="Defina a meta do mês" description="Com uma meta, você acompanha o quanto falta para chegar lá." />
        )}
      </Card>
    </div>
  )
}
