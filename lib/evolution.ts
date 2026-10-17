import 'server-only'

const BASE = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '')
const KEY = process.env.EVOLUTION_API_KEY || ''

export const evolutionConfigurada = Boolean(BASE && KEY)

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', apikey: KEY, ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json() as Promise<T>
}

export async function criarInstancia(instanceName: string, webhookUrl?: string) {
  try {
    await call('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName,
        integration: 'WHATSAPP-BAILEYS',
        qrcode: true,
        ...(webhookUrl
          ? { webhook: { url: webhookUrl, byEvents: false, base64: false, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'] } }
          : {}),
      }),
    })
  } catch (e) {
    // Instância já existente não é erro
    if (!String((e as Error).message).includes('403') && !String((e as Error).message).includes('already')) throw e
  }
  return call<{ base64?: string; code?: string; pairingCode?: string }>(`/instance/connect/${encodeURIComponent(instanceName)}`)
}

export async function estadoInstancia(instanceName: string) {
  const r = await call<{ instance?: { state?: string } }>(`/instance/connectionState/${encodeURIComponent(instanceName)}`)
  return r.instance?.state ?? 'close'
}

export async function enviarTexto(instanceName: string, numero: string, texto: string) {
  // Atraso humanizado proporcional ao tamanho do texto (compliance anti-bloqueio)
  const delay = Math.min(4000, 1200 + texto.length * 25)
  return call(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: 'POST',
    body: JSON.stringify({ number: numero.replace(/\D/g, ''), text: texto, delay }),
  })
}

export async function desconectar(instanceName: string) {
  return call(`/instance/logout/${encodeURIComponent(instanceName)}`, { method: 'DELETE' })
}
