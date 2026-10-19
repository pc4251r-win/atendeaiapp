import 'server-only'

const BASE = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '')
const KEY = process.env.EVOLUTION_API_KEY || ''

export const evolutionConfigurada = Boolean(BASE && KEY)

/**
 * Eventos que disparam webhook. Inclui os de sincronização em lote
 * (MESSAGES_SET, CHATS_SET, CONTACTS_SET) que trazem o histórico antigo
 * quando a instância conecta.
 */
const EVENTS = [
  'MESSAGES_UPSERT',    // mensagem individual em tempo real
  'MESSAGES_SET',       // lote com histórico de mensagens
  'CHATS_UPSERT',       // conversa nova
  'CHATS_SET',          // lote com todas as conversas
  'CONTACTS_UPSERT',    // contato novo
  'CONTACTS_SET',       // lote com todos os contatos
  'CONNECTION_UPDATE',  // status da conexão mudou
  'QRCODE_UPDATED',     // QR novo gerado
]

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', apikey: KEY, ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json() as Promise<T>
}

/**
 * Cria a instância (se não existir) já com syncFullHistory: true,
 * e garante que os webhooks estão apontando para o app.
 */
export async function criarInstancia(instanceName: string, webhookUrl?: string) {
  try {
    await call('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        ...(webhookUrl
          ? { webhook: { url: webhookUrl, byEvents: false, base64: false, events: EVENTS } }
          : {}),
        settings: {
          syncFullHistory: true,   // 🔑 essa linha faz o histórico vir
          readMessages: false,
          readStatus: false,
          readReceipts: false,
          rejectCall: false,
          groupsIgnore: true,      // ignora grupos (evita poluir o Inbox)
          alwaysOnline: false,
        },
      }),
    })
  } catch (e) {
    // Instância já existente não é erro
    const msg = String((e as Error).message)
    if (!msg.includes('403') && !msg.includes('already') && !msg.includes('409')) throw e
  }
  return call<{ base64?: string; code?: string; pairingCode?: string }>(
    `/instance/connect/${encodeURIComponent(instanceName)}`,
  )
}

/**
 * Garante que uma instância JÁ EXISTENTE recebeu as configurações novas.
 * Uso: chamar sempre no fluxo "conectar" — se a instância é nova, é redundante;
 * se já existia (antes do deploy desta versão), atualiza agora.
 */
export async function garantirSyncHistorico(instanceName: string, webhookUrl?: string) {
  // 1) Ativa syncFullHistory na instância
  try {
    await call(`/settings/set/${encodeURIComponent(instanceName)}`, {
      method: 'POST',
      body: JSON.stringify({ syncFullHistory: true }),
    })
  } catch (e) {
    console.warn('[AtendeAI] /settings/set falhou (não bloqueante):', e)
  }

  // 2) Atualiza os eventos de webhook para incluir os de sincronização em lote
  if (webhookUrl) {
    try {
      await call(`/webhook/set/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        body: JSON.stringify({
          url: webhookUrl,
          byEvents: false,
          base64: false,
          events: EVENTS,
          enabled: true,
        }),
      })
    } catch (e) {
      console.warn('[AtendeAI] /webhook/set falhou (não bloqueante):', e)
    }
  }
}

export async function estadoInstancia(instanceName: string) {
  const r = await call<{ instance?: { state?: string } }>(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
  )
  return r.instance?.state ?? 'close'
}

export async function enviarTexto(instanceName: string, numero: string, texto: string) {
  const delay = Math.min(4000, 1200 + texto.length * 25)
  return call(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({ number: numero.replace(/\D/g, ''), text: texto, delay }),
  })
}

export async function desconectar(instanceName: string) {
  return call(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: 'DELETE' })
}

/**
 * Força sincronização imediata em instância já conectada.
 * Útil quando o cliente quer ver o histórico AGORA, sem desconectar/reconectar.
 * Pode falhar em algumas versões da Evolution — nesse caso, orientar o cliente
 * a desconectar e reconectar.
 */
export async function sincronizarAgora(instanceName: string) {
  const resultados: Record<string, string> = {}
  for (const endpoint of ['/chat/fetchChats', '/chat/fetchContacts']) {
    try {
      await call(`${endpoint}/${encodeURIComponent(instanceName)}`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      resultados[endpoint] = 'ok'
    } catch (e) {
      resultados[endpoint] = `erro: ${(e as Error).message.slice(0, 120)}`
    }
  }
  return resultados
}