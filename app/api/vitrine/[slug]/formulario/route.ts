import { NextResponse } from 'next/server'
import { getPublicSupabase } from '@/lib/vitrine-server'
import { rateLimit } from '@/lib/rate-limit'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (!rateLimit(`form:${ip}`, 5, 10 * 60_000)) return NextResponse.json({ ok: false, error: 'Muitos envios. Tente em alguns minutos.' }, { status: 429 })

  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  const nome = String(b?.nome ?? '').trim().slice(0, 80)
  const telefone = String(b?.telefone ?? '').replace(/\D/g, '')
  const data = String(b?.data_desejada ?? '')
  const horario = String(b?.horario ?? '')
  const servico = String(b?.servico_id ?? '')
  if (nome.length < 2 || telefone.length < 10 || telefone.length > 13) return NextResponse.json({ ok: false, error: 'Informe nome e WhatsApp válidos.' }, { status: 400 })

  const supabase = getPublicSupabase()
  if (!supabase) return NextResponse.json({ ok: false, error: 'Site indisponível no momento.' }, { status: 503 })
  const { error } = await supabase.rpc('enviar_formulario_site', {
    p_slug: slug,
    p_nome: nome,
    p_telefone: telefone,
    p_mensagem: String(b?.mensagem ?? '').slice(0, 1000),
    p_servico_id: UUID.test(servico) ? servico : null,
    p_data: /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null,
    p_horario: /^\d{2}:\d{2}$/.test(horario) ? horario : '',
  })
  if (error) {
    const limite = error.message.includes('limite')
    return NextResponse.json({ ok: false, error: limite ? 'Você já enviou alguns pedidos. Aguarde nosso contato.' : 'Não foi possível enviar agora.' }, { status: limite ? 429 : 400 })
  }
  return NextResponse.json({ ok: true })
}
