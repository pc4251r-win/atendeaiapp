import { generateText } from 'ai'
import { cookies } from 'next/headers'
import { getTenantContext } from '@/lib/supabase-server'
import { clientIp, rateLimit } from '@/lib/rate-limit'

export const maxDuration = 30

export async function POST(req: Request) {
  const demo = (await cookies()).get('atendeai_demo')?.value === '1'
  const tenant = demo ? null : await getTenantContext()
  if (!demo && !tenant) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (!rateLimit(`copiloto:${tenant?.empresaId ?? clientIp(req)}`, 20, 60_000))
    return Response.json({ error: 'Limite de requisições atingido' }, { status: 429 })

  const body = (await req.json().catch(() => null)) as { pergunta?: string; resumo?: string } | null
  if (!body?.pergunta || body.pergunta.length > 1000) return Response.json({ error: 'Requisição inválida' }, { status: 400 })

  try {
    const { text } = await generateText({
      model: 'openai/gpt-5.4-mini',
      system:
        'Você é o Copiloto do AtendeAI 360, um assistente para o dono de uma pequena empresa brasileira. Responda em português, de forma objetiva (até 5 frases), usando APENAS os dados do resumo do negócio fornecido. Sugira uma ação prática no final.',
      prompt: `Resumo do negócio:\n${(body.resumo ?? '').slice(0, 6000)}\n\nPergunta: ${body.pergunta}`,
      timeout: 20_000,
    })
    return Response.json({ texto: text.trim() })
  } catch {
    return Response.json({ error: 'LLM indisponível' }, { status: 503 })
  }
}
