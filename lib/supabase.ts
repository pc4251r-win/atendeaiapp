import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

function sanitizeUrl(raw?: string): string {
  if (!raw) return ''
  return raw.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '').replace(/\/+$/, '')
}

export const SUPABASE_URL = sanitizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY && /^https?:\/\//.test(SUPABASE_URL))

/** Cookie do modo demonstração: não dá acesso a dado real algum, só libera a rota /painel com dados fictícios. */
export const DEMO_COOKIE = 'atendeai_demo'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (client) return client
  try {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
    return client
  } catch (error) {
    console.warn('[AtendeAI] Falha ao iniciar Supabase:', error)
    return null
  }
}

export function setDemoCookie(on: boolean) {
  document.cookie = on
    ? `${DEMO_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
    : `${DEMO_COOKIE}=; path=/; max-age=0; samesite=lax`
}
