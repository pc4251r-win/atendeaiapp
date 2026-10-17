'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Landmark, Save } from 'lucide-react'
import { Badge, Btn, Card, Field, Input, Select, Switch } from '@/components/atendeai/ui'
import { ANEXO_LABEL, REGIME_LABEL, aliquotaAutomatica, limiteFiscal, servicoShareDe } from '@/lib/financeiro'
import { brl } from '@/lib/format'
import type { AnexoSimples, FinanceiroConfig, RegimeTributario } from '@/lib/types'
import { cn } from '@/lib/utils'
import { fmtPct, useFin } from './shared'

const IMPOSTOS: Record<RegimeTributario, string> = {
  mei: 'DAS-MEI fixo mensal (INSS + ISS/ICMS embutidos). Não há alíquota sobre cada venda.',
  simples: 'DAS unificado: reúne IRPJ, CSLL, PIS, COFINS, CPP e ISS ou ICMS numa única guia, pela alíquota efetiva da sua faixa.',
  presumido: 'IRPJ, CSLL, PIS e COFINS calculados sobre uma base presumida, mais ISS ou ICMS conforme a atividade. Aqui usamos uma alíquota média estimada.',
  real: 'IRPJ e CSLL sobre o lucro contábil, PIS e COFINS não cumulativos, mais ISS ou ICMS. Aqui usamos uma alíquota média estimada; confirme com seu contador.',
}

const paraNumero = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function FinFiscal() {
  const { ctx, salvarConfig, notify } = useFin()
  const [d, setD] = useState<FinanceiroConfig>(ctx.cfg)
  const share = useMemo(() => servicoShareDe(ctx.receitas, ctx.porId), [ctx])

  const auto = aliquotaAutomatica(d, ctx.rbt12, share)
  const aliquota = d.regime === 'mei' ? 0 : d.aliquota_manual ? d.aliquota_efetiva : auto
  const reserva = d.regime === 'mei' ? d.das_mei : (d.faturamento_estimado * aliquota) / 100
  const limite = limiteFiscal(d, ctx.rbt12)
  const alterado = JSON.stringify(d) !== JSON.stringify(ctx.cfg)

  const salvar = () => {
    if (d.dia_pagamento < 1 || d.dia_pagamento > 31) return notify('O dia de pagamento deve ficar entre 1 e 31.')
    if (d.aliquota_manual && (d.aliquota_efetiva < 0 || d.aliquota_efetiva > 60)) return notify('Informe uma alíquota entre 0% e 60%.')
    salvarConfig(
      {
        regime: d.regime,
        anexo: d.anexo,
        faturamento_estimado: d.faturamento_estimado,
        aliquota_manual: d.aliquota_manual,
        aliquota_efetiva: d.aliquota_manual ? d.aliquota_efetiva : Math.round(auto * 100) / 100,
        dia_pagamento: d.dia_pagamento,
        comissao_padrao: d.comissao_padrao,
        das_mei: d.das_mei,
      },
      'Atualizou as configurações fiscais',
    )
    notify('Configurações fiscais salvas.')
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-captacao" />
          <h2 className="font-medium">Regime tributário</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Regime">
            <Select value={d.regime} onChange={(e) => setD({ ...d, regime: e.target.value as RegimeTributario })}>
              {(Object.keys(REGIME_LABEL) as RegimeTributario[]).map((r) => (
                <option key={r} value={r}>
                  {REGIME_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          {d.regime === 'simples' && (
            <Field label="Anexo do Simples">
              <Select value={d.anexo} onChange={(e) => setD({ ...d, anexo: e.target.value as AnexoSimples })}>
                {(Object.keys(ANEXO_LABEL) as AnexoSimples[]).map((a) => (
                  <option key={a} value={a}>
                    {ANEXO_LABEL[a]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {d.regime === 'mei' && (
            <Field label="DAS-MEI mensal (R$)" hint="Valor fixo da guia; confira o ano vigente">
              <Input inputMode="decimal" value={d.das_mei || ''} onChange={(e) => setD({ ...d, das_mei: paraNumero(e.target.value) })} />
            </Field>
          )}
          <Field label="Faturamento mensal estimado (R$)" hint="Usado quando ainda não há 12 meses de histórico">
            <Input inputMode="decimal" value={d.faturamento_estimado || ''} onChange={(e) => setD({ ...d, faturamento_estimado: paraNumero(e.target.value) })} />
          </Field>
          <Field label="Dia do mês para pagar o imposto">
            <Input type="number" min={1} max={31} value={d.dia_pagamento} onChange={(e) => setD({ ...d, dia_pagamento: Number(e.target.value) || 1 })} />
          </Field>
          <Field label="Comissão padrão sobre venda (%)" hint="Itens do catálogo podem ter comissão própria">
            <Input inputMode="decimal" value={d.comissao_padrao || ''} onChange={(e) => setD({ ...d, comissao_padrao: paraNumero(e.target.value) })} />
          </Field>
        </div>

        {d.regime !== 'mei' && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Alíquota efetiva</span>
                <span className="text-xs text-muted-foreground">
                  Calculada automaticamente: <strong className="text-foreground">{auto.toFixed(2).replace('.', ',')}%</strong> (faturamento dos últimos 12 meses: {brl(ctx.rbt12)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Definir manualmente</span>
                <Switch checked={d.aliquota_manual} onChange={(v) => setD({ ...d, aliquota_manual: v, aliquota_efetiva: v && !d.aliquota_manual ? Math.round(auto * 100) / 100 : d.aliquota_efetiva })} label="Definir alíquota manualmente" />
              </div>
            </div>
            {d.aliquota_manual && (
              <Field label="Alíquota efetiva (%)">
                <Input inputMode="decimal" value={d.aliquota_efetiva || ''} onChange={(e) => setD({ ...d, aliquota_efetiva: paraNumero(e.target.value) })} className="max-w-40" />
              </Field>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{alterado ? 'Há alterações não salvas.' : 'Tudo salvo.'}</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setD(ctx.cfg)} disabled={!alterado}>
              Descartar
            </Btn>
            <Btn onClick={salvar} disabled={!alterado}>
              <Save /> Salvar
            </Btn>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Reserva mensal para tributos</h2>
          <p className="text-3xl font-semibold tracking-tight">{brl(reserva)}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {d.regime === 'mei' ? `DAS fixo pago todo dia ${d.dia_pagamento}.` : `${fmtPct(aliquota / 100, 2)} sobre ${brl(d.faturamento_estimado)}. Separe esse valor até o dia ${d.dia_pagamento} para pagar sem aperto.`}
          </p>
        </Card>

        {limite && (
          <Card className="flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Limite anual de faturamento</h2>
              <Badge tone={limite.pct > 1 ? 'erro' : limite.pct >= 0.8 ? 'pos' : 'vendas'}>{fmtPct(limite.pct, 0)}</Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.round(limite.pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Uso do limite anual">
              <div className={cn('h-full rounded-full', limite.pct > 1 ? 'bg-destructive' : limite.pct >= 0.8 ? 'bg-pos' : 'bg-vendas')} style={{ width: `${Math.min(100, limite.pct * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {brl(limite.usado)} de {brl(limite.limite)} em 12 meses ({limite.nome}).
            </p>
            {limite.pct >= 0.8 && (
              <p className="flex items-start gap-2 rounded-lg border border-pos/30 bg-pos/10 p-3 text-xs leading-relaxed text-pos">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {limite.pct > 1 ? `Você passou do limite do ${limite.nome}. Converse com seu contador sobre a mudança de regime.` : `Você já usou ${fmtPct(limite.pct, 0)} do limite do ${limite.nome}. Planeje a transição antes de ultrapassar.`}
              </p>
            )}
          </Card>
        )}

        <Card className="flex flex-col gap-2 p-5">
          <h2 className="text-sm font-medium text-muted-foreground">Como {REGIME_LABEL[d.regime]} é calculado</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{IMPOSTOS[d.regime]}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">Estimativa de apoio à decisão; não substitui o cálculo oficial do seu contador. Não calculamos ICMS por estado nem emitimos nota fiscal.</p>
        </Card>
      </div>
    </div>
  )
}
