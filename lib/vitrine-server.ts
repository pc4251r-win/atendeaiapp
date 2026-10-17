import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from './supabase'
import type { VitrinePublica } from './vitrine'

/** Cliente anônimo (sem cookies): a vitrine é pública e só acessa dados via funções security definer. */
export function getPublicSupabase() {
  if (!isSupabaseConfigured) return null
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
}

export async function getVitrinePublica(slug: string): Promise<VitrinePublica | null> {
  const supabase = getPublicSupabase()
  if (!supabase || !/^[a-z0-9-]{3,60}$/.test(slug)) return null
  const { data, error } = await supabase.rpc('vitrine_publica', { p_slug: slug })
  if (error || !data) return null
  const v = data as VitrinePublica
  v.catalogo = v.catalogo.map((c) => ({ ...c, preco: Number(c.preco) }))
  return v
}

export function siteUrl() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  return base.replace(/\/$/, '')
}

/** Imagens enviadas no editor podem estar em data URL: servimos por rota própria para OG/favicon. */
export function urlImagemPublica(slug: string, valor: string, tipo: 'og' | 'favicon') {
  if (!valor) return null
  if (valor.startsWith('data:')) return `/api/vitrine/${slug}/imagem?tipo=${tipo}`
  return valor
}
