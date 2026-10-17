import { generateText } from 'ai'
import { getAdminSupabase } from '@/lib/supabase-server'
import { enviarTexto } from '@/lib/evolution'
import { montarSystemPrompt } from '@/lib/ia-contexto'
import { pediuOptOut, precisaHumano } from '@/lib/ai'

export const maxDuration = 60

interface EvolutionEvento {
  event?: string
  instance?: string
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean }
    pushName?: string
    message?: { conversation?: string; extendedTextMessage?: { text?: string } }
  }
}

export async function POST(req: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret || new URL(req.url).searchParams.get('token') !== secret)
    return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 500 })

  const ev = (await req.json().catch(() => null)) as EvolutionEvento | null
  const evento = ev?.event?.toLowerCase().replace(/_/g, '.')
  if (!ev?.instance) return Response.json({ ok: true })

  const { data: conexao } = await admin.from('whatsapp_conexoes').select('*').eq('instance_name', ev.instance).maybeSingle()
  if (!conexao) return Response.json({ ok: true })
  const empresaId = conexao.empresa_id as string

  if (evento === 'connection.update') {
    return Response.json({ ok: true })
  }
  if (evento !== 'messages.upsert' || ev.data?.key?.fromMe) return Response.json({ ok: true })

  const telefone = (ev.data?.key?.remoteJid ?? '').split('@')[0]
  const texto = ev.data?.message?.conversation ?? ev.data?.message?.extendedTextMessage?.text ?? ''
  if (!telefone || !texto || telefone.includes('-')) return Response.json({ ok: true })
  const nome = ev.data?.pushName || telefone
  const agora = new Date().toISOString()

  const { data: empresa } = await admin.from('empresas').select('nome, segmento, status').eq('id', empresaId).single()
  if (empresa?.status !== 'ativo') return Response.json({ ok: true })

  // CRM automático
  const { data: cliente } = await admin
    .from('clientes_crm')
    .upsert({ empresa_id: empresaId, telefone, nome, ultima_interacao: agora }, { onConflict: 'empresa_id,telefone', ignoreDuplicates: false })
    .select()
    .single()

  let { data: at } = await admin
    .from('atendimentos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('cliente_telefone', telefone)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!at) {
    const ins = await admin
      .from('atendimentos')
      .insert({ empresa_id: empresaId, cliente_nome: nome, cliente_telefone: telefone, origem_campanha: 'WhatsApp direto', etapa_funil: 'captado', status: 'ia', ultima_mensagem: texto })
      .select()
      .single()
    at = ins.data
  }
  if (!at) return Response.json({ ok: true })

  await admin.from('mensagens').insert({ atendimento_id: at.id, remetente: 'cliente', texto })
  const patch: Record<string, unknown> = { ultima_mensagem: texto, updated_at: agora }
  if (at.status === 'finalizado') patch.status = 'ia'

  const responder = async (resposta: string) => {
    await enviarTexto(ev.instance!, telefone, resposta)
    await admin.from('mensagens').insert({ atendimento_id: at!.id, remetente: 'ia', texto: resposta })
    patch.ultima_mensagem = resposta
  }

  if (pediuOptOut(texto)) {
    await admin.from('clientes_crm').update({ opt_out: true, opt_in: false }).eq('id', cliente?.id)
    await responder('Pronto, você não receberá mais mensagens promocionais. Se precisar, é só chamar.')
    await admin.from('auditoria').insert({ empresa_id: empresaId, ator: 'ia', ator_nome: 'IA', acao: 'Registrou opt-out', detalhe: nome })
  } else if ((at.status === 'ia' || at.status === 'finalizado') && conexao.auto_resposta_ia) {
    if (precisaHumano(texto)) {
      patch.status = 'humano'
      await responder('Entendi! Vou te passar agora para alguém da nossa equipe, só um instante.')
      await admin.from('auditoria').insert({ empresa_id: empresaId, ator: 'ia', ator_nome: 'IA', acao: 'Transferiu para humano', detalhe: `${nome}: "${texto.slice(0, 120)}"` })
    } else {
      const [{ data: funcs }, { data: cat }, { data: kb }, { data: hist }] = await Promise.all([
        admin.from('funcionarios_ia').select('*').eq('empresa_id', empresaId).eq('ativo', true),
        admin.from('catalogo').select('nome, preco, duracao_minutos, descricao').eq('empresa_id', empresaId).eq('ativo', true).limit(40),
        admin.from('base_conhecimento').select('categoria, titulo, conteudo').eq('empresa_id', empresaId).eq('status', 'ativo').limit(40),
        admin.from('mensagens').select('remetente, texto').eq('atendimento_id', at.id).order('created_at', { ascending: false }).limit(12),
      ])
      const funcao = at.etapa_funil === 'pos_venda' ? 'pos_venda' : at.etapa_funil === 'agendado' ? 'agendamento' : 'vendas'
      const funcionario = funcs?.find((f) => f.funcao === funcao) ?? funcs?.[0]
      try {
        const { text } = await generateText({
          model: 'openai/gpt-5.4-mini',
          system: montarSystemPrompt({
            empresa: { nome: empresa.nome, segmento: empresa.segmento },
            funcionario,
            cliente,
            catalogo: cat ?? [],
            conhecimento: kb ?? [],
            horariosLivres: [],
            historico: [],
            etapa: at.etapa_funil,
          }),
          messages: (hist ?? []).reverse().map((m) => ({ role: m.remetente === 'cliente' ? ('user' as const) : ('assistant' as const), content: m.texto })),
          timeout: 25_000,
        })
        await responder(text.trim())
        if (at.etapa_funil === 'captado') patch.etapa_funil = 'em_negociacao'
      } catch (error) {
        console.error('[AtendeAI] Falha na IA do webhook:', error)
        patch.status = 'humano'
      }
    }
  }

  await admin.from('atendimentos').update(patch).eq('id', at.id)
  return Response.json({ ok: true })
}
