import { NextResponse } from 'next/server'
import { getPublicSupabase } from '@/lib/vitrine-server'
import { rateLimit } from '@/lib/rate-limit'

const ACOES = new Set(['visita', 'clique_whatsapp', 'clique_agendar'])

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (!rateLimit(`evento:${ip}`, 60, 60_000)) return NextResponse.json({ ok: false }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { acao?: string; origem?: string } | null
  if (!body?.acao || !ACOES.has(body.acao)) return NextResponse.json({ ok: false, error: 'Ação inválida' }, { status: 400 })

  const supabase = getPublicSupabase()
  if (!supabase) return NextResponse.json({ ok: true, demo: true })
  const { error } = await supabase.rpc('registrar_evento_site', { p_slug: slug, p_acao: body.acao, p_origem: String(body.origem ?? 'direto').slice(0, 60) })
  return NextResponse.json({ ok: !error })
}
