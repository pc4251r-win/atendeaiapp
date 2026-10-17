'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '@/components/atendeai/provider'
import { criarCtx } from '@/lib/financeiro'
import { brl, nowIso, uid } from '@/lib/format'
import type { FinanceiroConfig } from '@/lib/types'

export const COR = {
  lucro: '#10b981',
  prejuizo: '#ef4444',
  atencao: '#f59e0b',
  simulador: '#8b5cf6',
  info: '#3b82f6',
  neutro: '#64748b',
}

export const PALETA = [COR.info, COR.simulador, COR.atencao, COR.lucro, COR.prejuizo, COR.neutro]

export const tooltipStyle = {
  contentStyle: { background: '#111827', border: '1px solid #1F2937', borderRadius: 8, color: '#F9FAFB', fontSize: 12 },
  labelStyle: { color: '#9CA3AF' },
}

export const fmtPct = (fracao: number, casas = 1) => `${(fracao * 100).toFixed(casas).replace('.', ',')}%`
export const fmtNum = (n: number) => Math.round(n).toLocaleString('pt-BR')
export const brlCurto = (v: number) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toFixed(1).replace('.', ',')}k` : brl(v))

/** Contexto financeiro da empresa ativa, recalculado quando os dados mudam. */
export function useFin() {
  const data = useData()
  const { db, empresa, upsert } = data
  const ctx = useMemo(() => criarCtx(db, empresa.id), [db, empresa.id])

  const salvarConfig = (patch: Partial<FinanceiroConfig>, audit: string) =>
    upsert(
      'financeiro_config',
      { ...ctx.cfg, id: ctx.cfg.id || uid(), created_at: ctx.cfg.created_at || nowIso(), ...patch, empresa_id: empresa.id },
      audit,
    )

  return { ...data, ctx, salvarConfig }
}

/** Número em reais com transição suave (respeita prefers-reduced-motion). */
export function AnimatedBrl({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    const start = from.current
    const reduzido = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzido || start === value) {
      from.current = value
      setShown(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const passo = (t: number) => {
      const k = Math.min(1, (t - t0) / 600)
      const suave = 1 - Math.pow(1 - k, 3)
      const v = start + (value - start) * suave
      from.current = v
      setShown(v)
      if (k < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [value])

  return <>{brl(shown)}</>
}

export function baixarCsv(nome: string, linhas: (string | number)[][]) {
  const escapa = (c: string | number) => {
    const s = typeof c === 'number' ? c.toFixed(2).replace('.', ',') : c
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '\uFEFF' + linhas.map((l) => l.map(escapa).join(';')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
