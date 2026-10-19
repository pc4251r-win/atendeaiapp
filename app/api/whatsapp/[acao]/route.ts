import { cookies } from 'next/headers'
import { getTenantContext } from '@/lib/supabase-server'
import {
  criarInstancia,
  desconectar,
  enviarTexto,
  estadoInstancia,
  evolutionConfigurada,
  garantirSyncHistorico,
  sincronizarAgora,
} from '@/lib/evolution'
import { rateLimit } from '@/lib/rate-limit'

type Acao = 'conectar' | 'status' | 'enviar' | 'desconectar' | 'sincronizar'

export async function POST(req: Request, { params }: { params: Promise<{ acao: string }> }) {
  const { acao } = (await params) as { acao: Acao }
  const demo = (await cookies()).get('atendeai_demo')?.value === '1'

  if (demo || !evolutionConfigurada) {
    return Response.json({ simulado: true, motivo: demo ? 'modo_demo' : 'evolution_nao_configurada' })
  }

  const tenant = await getTenantContext()
  if (!tenant) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: conexao } = await tenant.supabase
    .from('whatsapp_conexoes')
    .select('id, instance_name')
    .eq('empresa_id', tenant.empresaId)
    .maybeSingle()

  const instance = conexao?.instance_name ?? `atd-${tenant.empresaId.replace(/-/g, '')}`

  try {
    if (acao === 'conectar') {
      const origin = new URL(req.url).origin
      const secret = process.env.EVOLUTION_WEBHOOK_SECRET
      const webhook = secret
        ? `${origin}/api/whatsapp/webhook?token=${encodeURIComponent(secret)}`
        : undefined

      // 🔑 Garante syncFullHistory + eventos de webhook em instâncias já existentes
      //    (para instâncias novas é redundante, mas não causa problema)
      await garantirSyncHistorico(instance, webhook)

      const r = await criarInstancia(instance, webhook)
      const qr = r.base64 ?? ''

      await tenant.supabase
        .from('whatsapp_conexoes')
        .upsert({
          ...(conexao?.id ? { id: conexao.id } : {}),
          empresa_id: tenant.empresaId,
          instance_name: instance,
          status: 'qr_pendente',
          qr_code_base64: qr,
          updated_at: new Date().toISOString(),
        })

      return Response.json({ qr, pairingCode: r.pairingCode ?? null })
    }

    if (acao === 'status') {
      const state = await estadoInstancia(instance)
      const status =
        state === 'open' ? 'conectado' : state === 'connecting' ? 'qr_pendente' : 'desconectado'
      await tenant.supabase
        .from('whatsapp_conexoes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('empresa_id', tenant.empresaId)
      return Response.json({ status })
    }

    if (acao === 'enviar') {
      if (!rateLimit(`wa:${tenant.empresaId}`, 20, 60_000))
        return Response.json({ error: 'Limite de envio por minuto atingido' }, { status: 429 })

      const body = (await req.json().catch(() => null)) as {
        telefone?: string
        texto?: string
      } | null
      if (!body?.telefone || !body.texto || body.texto.length > 4000)
        return Response.json({ error: 'Requisição inválida' }, { status: 400 })

      const { data: cli } = await tenant.supabase
        .from('clientes_crm')
        .select('opt_out')
        .eq('empresa_id', tenant.empresaId)
        .eq('telefone', body.telefone)
        .maybeSingle()

      if (cli?.opt_out)
        return Response.json(
          { error: 'Cliente pediu para não receber mensagens (opt-out)' },
          { status: 403 },
        )

      await enviarTexto(instance, body.telefone, body.texto)
      return Response.json({ ok: true })
    }

    if (acao === 'desconectar') {
      await desconectar(instance)
      await tenant.supabase
        .from('whatsapp_conexoes')
        .update({ status: 'desconectado', qr_code_base64: '' })
        .eq('empresa_id', tenant.empresaId)
      return Response.json({ ok: true })
    }

    if (acao === 'sincronizar') {
      // Força sincronização em instância já conectada (sem desconectar)
      const resultado = await sincronizarAgora(instance)
      return Response.json({ ok: true, resultado })
    }

    return Response.json({ error: 'Ação desconhecida' }, { status: 404 })
  } catch (error) {
    console.error('[AtendeAI] Evolution API:', error)
    return Response.json({ error: 'Falha ao comunicar com a Evolution API' }, { status: 502 })
  }
}