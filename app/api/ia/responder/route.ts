import { generateText } from 'ai'
import { cookies } from 'next/headers'
import { montarSystemPrompt, type ContextoIA } from '@/lib/ia-contexto'
import { getTenantContext } from '@/lib/supabase-server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

export async function POST(req: Request) {
  const demo = (await cookies()).get('atendeai_demo')?.value === '1'
  const tenant = demo ? null : await getTenantContext()
  if (!demo && !tenant) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const chave = tenant?.empresaId ?? `demo:${clientIp(req)}`
  if (!rateLimit(`ia:${chave}`, demo ? 15 : 60, 60_000))
    return Response.json({ error: 'Limite de requisições atingido' }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { contexto?: ContextoIA; texto?: string } | null
  if (!body?.contexto || typeof body.texto !== 'string' || body.texto.length > 2000)
    return Response.json({ error: 'Requisição inválida' }, { status: 400 })

  const ctx = body.contexto
  ctx.historico = (ctx.historico ?? []).slice(-12)
  ctx.catalogo = (ctx.catalogo ?? []).slice(0, 40)
  ctx.conhecimento = (ctx.conhecimento ?? []).slice(0, 40)

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.4-mini',
      system: montarSystemPrompt(ctx),
      messages: [
        ...ctx.historico.map((m) => ({
          role: m.remetente === 'cliente' ? ('user' as const) : ('assistant' as const),
          content: m.texto,
        })),
        { role: 'user' as const, content: body.texto },
      ],
      timeout: 20_000,
    })
    return Response.json({ texto: text.trim(), fonte: 'llm' })
  } catch (error) {
    console.warn('[AtendeAI] LLM indisponível, cliente usará motor local:', (error as Error).message)
    return Response.json({ error: 'LLM indisponível' }, { status: 503 })
  }
}
