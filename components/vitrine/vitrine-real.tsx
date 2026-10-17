'use client'

import { useEffect, useRef } from 'react'
import { VitrineView, type FormularioSiteInput } from './vitrine-view'
import type { VitrinePublica } from '@/lib/vitrine'
import type { AcaoSite } from '@/lib/types'

export function origemVisita() {
  const p = new URLSearchParams(window.location.search)
  const utm = p.get('utm_source') || p.get('origem')
  if (utm) return utm
  try {
    const ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''
    if (!ref || ref === window.location.hostname) return 'direto'
    if (ref.includes('instagram')) return 'instagram'
    if (ref.includes('facebook')) return 'facebook'
    if (ref.includes('google')) return 'google'
    if (ref.includes('whatsapp') || ref.includes('wa.me')) return 'whatsapp'
    return ref
  } catch {
    return 'direto'
  }
}

export function VitrineReal({ data }: { data: VitrinePublica }) {
  const slug = data.site.slug
  const registrou = useRef(false)

  const evento = (acao: AcaoSite) => {
    const body = JSON.stringify({ acao, origem: origemVisita() })
    if (navigator.sendBeacon) navigator.sendBeacon(`/api/vitrine/${slug}/evento`, new Blob([body], { type: 'application/json' }))
    else void fetch(`/api/vitrine/${slug}/evento`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true })
  }

  useEffect(() => {
    if (registrou.current) return
    registrou.current = true
    const chave = `vitrine:visita:${slug}`
    if (sessionStorage.getItem(chave)) return
    sessionStorage.setItem(chave, '1')
    evento('visita')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const formulario = async (f: FormularioSiteInput) => {
    const r = await fetch(`/api/vitrine/${slug}/formulario`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    return { ok: Boolean(j.ok), error: j.error }
  }

  return <VitrineView data={data} onEvento={evento} onFormulario={formulario} />
}
