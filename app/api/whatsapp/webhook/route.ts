import { generateText } from 'ai'
import { getAdminSupabase } from '@/lib/supabase-server'
import { enviarTexto } from '@/lib/evolution'
import { montarSystemPrompt } from '@/lib/ia-contexto'
import { pediuOptOut, precisaHumano } from '@/lib/ai'

export const maxDuration = 60

interface EvolutionEvento {
  event?: string
  instance?: string
  data?: any
}

/** Extrai apenas os dígitos do telefone do JID do WhatsApp */
function telefoneDoJid(jid?: string): string {
  if (!jid) return ''
  if (jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter')) return ''
  return jid.split('@')[0].split(':')[0].replace(/\D/g, '')
}

/** Verifica se o JID é de um grupo */
function ehGrupo(jid?: string): boolean {
  return !!jid && (jid.includes('@g.us') || jid.includes('@broadcast') || jid.includes('@newsletter'))
}

/** Extrai texto de qualquer tipo de mensagem (texto, áudio, imagem, etc.) */
function extrairTexto(msg: any): string {
  if (!msg) return ''
  if (typeof msg.conversation === 'string') return msg.conversation
  if (typeof msg.extendedTextMessage?.text === 'string') return msg.extendedTextMessage.text
  if (msg.imageMessage) return msg.imageMessage.caption || '[imagem]'
  if (msg.videoMessage) return msg.videoMessage.caption || '[vídeo]'
  if (msg.audioMessage) return '[áudio]'
  if (msg.documentMessage) return msg.documentMessage.title || '[documento]'
  if (msg.stickerMessage) return '[figurinha]'
  if (msg.locationMessage) return '[localização]'
  if (msg.contactMessage) return '[contato]'
  if (msg.buttonsResponseMessage) return msg.buttonsResponseMessage.selectedDisplayText || '[botão]'
  if (msg.listResponseMessage) return msg.listResponseMessage.title || '[lista]'
  return ''
}

export async function POST(req: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret || new URL(req.url).searchParams.get('token') !== secret)
    return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = getAdminSupabase()
  if (!admin) return Response.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 500 })

  const ev = (await req.json().catch(() => null)) as EvolutionEvento | null
  if (!ev?.instance) return Response.json({ ok: true })

  const evento = ev.event?.toLowerCase().replace(/_/g, '.') ?? ''

  const { data: conexao } = await admin
    .from('whatsapp_conexoes')
    .select('*')
    .eq('instance_name', ev.instance)
    .maybeSingle()
  if (!conexao) return Response.json({ ok: true })
  const empresaId = conexao.empresa_id as string

  // Eventos de conexão — apenas ignora
  if (evento === 'connection.update' || evento === 'qrcode.updated') {
    return Response.json({ ok: true })
  }

  // Só processa se a empresa está ativa
  const { data: empresa } = await admin
    .from('empresas')
    .select('nome, segmento, status')
    .eq('id', empresaId)
    .single()
  if (empresa?.status !== 'ativo') return Response.json({ ok: true })

  // ============================================================
  // 1) CONTATOS EM LOTE — sincronização ao conectar
  // ============================================================
  if (evento === 'contacts.set' || evento === 'contacts.upsert') {
    const contatos = evento === 'contacts.set'
      ? (Array.isArray(ev.data) ? ev.data : ev.data?.contacts ?? [])
      : [ev.data]

    let salvos = 0
    for (const c of contatos) {
      if (!c) continue
      const jid = c.id ?? c.remoteJid ?? c.jid
      if (!jid || ehGrupo(jid)) continue
      const telefone = telefoneDoJid(jid)
      if (!telefone || telefone.length < 10) continue
      const nome = c.pushName || c.name || c.notify || telefone
      await admin.from('clientes_crm').upsert(
        {
          empresa_id: empresaId,
          telefone,
          nome,
          ultima_interacao: new Date().toISOString(),
        },
        { onConflict: 'empresa_id,telefone', ignoreDuplicates: false },
      )
      salvos++
    }
    return Response.json({ ok: true, contatos: salvos })
  }

  // ============================================================
  // 2) CONVERSAS EM LOTE — sincronização ao conectar
  // ============================================================
  if (evento === 'chats.set' || evento === 'chats.upsert') {
    const chats = evento === 'chats.set'
      ? (Array.isArray(ev.data) ? ev.data : ev.data?.chats ?? [])
      : [ev.data]

    let salvos = 0
    for (const c of chats) {
      if (!c) continue
      const jid = c.id ?? c.remoteJid
      if (!jid || ehGrupo(jid)) continue
      const telefone = telefoneDoJid(jid)
      if (!telefone || telefone.length < 10) continue
      const nome = c.name || c.pushName || telefone

      const { data: existente } = await admin
        .from('atendimentos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('cliente_telefone', telefone)
        .maybeSingle()

      if (!existente) {
        await admin.from('atendimentos').insert({
          empresa_id: empresaId,
          cliente_nome: nome,
          cliente_telefone: telefone,
          origem_campanha: 'Histórico WhatsApp',
          etapa_funil: 'captado',
          status: 'finalizado',
          ultima_mensagem: '',
        })
        salvos++
      }
    }
    return Response.json({ ok: true, chats: salvos })
  }

  // ============================================================
  // 3) HISTÓRICO DE MENSAGENS EM LOTE — a parte mais importante
  // ============================================================
  if (evento === 'messages.set') {
    const msgs = Array.isArray(ev.data) ? ev.data : ev.data?.messages ?? []

    // Agrupa por telefone para reduzir consultas ao banco
    const porTelefone = new Map<string, { nome: string; msgs: any[] }>()
    for (const m of msgs) {
      const jid = m?.key?.remoteJid
      if (!jid || ehGrupo(jid)) continue
      const telefone = telefoneDoJid(jid)
      if (!telefone || telefone.length < 10) continue
      const nome = m?.pushName || telefone
      if (!porTelefone.has(telefone)) porTelefone.set(telefone, { nome, msgs: [] })
      porTelefone.get(telefone)!.msgs.push(m)
    }

    let importadas = 0
    let conversas = 0

    for (const [telefone, dados] of porTelefone) {
      // Ordena mensagens por timestamp (mais antiga primeiro)
      const ordenadas = [...dados.msgs].sort((a, b) => {
        const ta = Number(a?.messageTimestamp ?? 0)
        const tb = Number(b?.messageTimestamp ?? 0)
        return ta - tb
      })

      // Garante cliente no CRM
      await admin.from('clientes_crm').upsert(
        {
          empresa_id: empresaId,
          telefone,
          nome: dados.nome,
          ultima_interacao: new Date().toISOString(),
        },
        { onConflict: 'empresa_id,telefone', ignoreDuplicates: false },
      )

      // Busca ou cria atendimento
      let { data: at } = await admin
        .from('atendimentos')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('cliente_telefone', telefone)
        .maybeSingle()

      if (!at) {
        const { data: novo } = await admin
          .from('atendimentos')
          .insert({
            empresa_id: empresaId,
            cliente_nome: dados.nome,
            cliente_telefone: telefone,
            origem_campanha: 'Histórico WhatsApp',
            etapa_funil: 'captado',
            status: 'finalizado',
            ultima_mensagem: '',
          })
          .select()
          .single()
        at = novo
      }
      if (!at) continue
      conversas++

      // Importa mensagens (uma por uma para evitar duplicata)
      for (const m of ordenadas) {
        const texto = extrairTexto(m?.message)
        if (!texto) continue
        const fromMe = Boolean(m?.key?.fromMe)
        const timestamp = m?.messageTimestamp
          ? new Date(Number(m.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString()

        // Evita duplicata: mesma mensagem do mesmo remetente no mesmo atendimento
        const { data: dup } = await admin
          .from('mensagens')
          .select('id')
          .eq('atendimento_id', at.id)
          .eq('texto', texto)
          .eq('remetente', fromMe ? 'humano' : 'cliente')
          .limit(1)
          .maybeSingle()
        if (dup) continue

        await admin.from('mensagens').insert({
          atendimento_id: at.id,
          remetente: fromMe ? 'humano' : 'cliente',
          texto,
          created_at: timestamp,
        })
        importadas++
      }

      // Atualiza última mensagem do atendimento
      const ultima = ordenadas[ordenadas.length - 1]
      const textoUlt = extrairTexto(ultima?.message)
      if (textoUlt) {
        await admin
          .from('atendimentos')
          .update({ ultima_mensagem: textoUlt, updated_at: new Date().toISOString() })
          .eq('id', at.id)
      }
    }

    console.log(`[AtendeAI] Histórico sincronizado: ${importadas} mensagens em ${conversas} conversas`)
    return Response.json({ ok: true, mensagens: importadas, conversas })
  }

  // ============================================================
  // 4) MENSAGEM INDIVIDUAL (tempo real) — comportamento original
  // ============================================================
  if (evento !== 'messages.upsert') return Response.json({ ok: true })

  const jid = ev.data?.key?.remoteJid
  if (!jid || ehGrupo(jid)) return Response.json({ ok: true })

  const fromMe = Boolean(ev.data?.key?.fromMe)
  const telefone = telefoneDoJid(jid)
  const texto = extrairTexto(ev.data?.message)
  if (!telefone || !texto) return Response.json({ ok: true })

  const nome = ev.data?.pushName || telefone
  const agora = new Date().toISOString()

  const { data: cliente } = await admin
    .from('clientes_crm')
    .upsert(
      { empresa_id: empresaId, telefone, nome, ultima_interacao: agora },
      { onConflict: 'empresa_id,telefone', ignoreDuplicates: false },
    )
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
      .insert({
        empresa_id: empresaId,
        cliente_nome: nome,
        cliente_telefone: telefone,
        origem_campanha: 'WhatsApp direto',
        etapa_funil: 'captado',
        status: 'ia',
        ultima_mensagem: texto,
      })
      .select()
      .single()
    at = ins.data
  }
  if (!at) return Response.json({ ok: true })

  await admin.from('mensagens').insert({
    atendimento_id: at.id,
    remetente: fromMe ? 'humano' : 'cliente',
    texto,
  })

  const patch: Record<string, unknown> = { ultima_mensagem: texto, updated_at: agora }
  if (at.status === 'finalizado' && !fromMe) patch.status = 'ia'

  // Se foi mensagem enviada por nós (fromMe), salva e retorna sem IA
  if (fromMe) {
    await admin.from('atendimentos').update(patch).eq('id', at.id)
    return Response.json({ ok: true })
  }

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
          messages: (hist ?? [])
            .reverse()
            .map((m) => ({
              role: m.remetente === 'cliente' ? ('user' as const) : ('assistant' as const),
              content: m.texto,
            })),
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