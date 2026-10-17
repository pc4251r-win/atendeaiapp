import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from './supabase'

export async function getServerSupabase() {
  if (!isSupabaseConfigured) return null
  const store = await cookies()
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          /* chamado de Server Component: o proxy renova a sessão */
        }
      },
    },
  })
}

/** Cliente com service role: uso EXCLUSIVO no servidor (webhooks sem sessão de usuário). */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!isSupabaseConfigured || !key) return null
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } })
}

/** Resolve o usuário logado + empresa ativa. Retorna null se não autenticado ou empresa não liberada. */
export async function getTenantContext() {
  const supabase = await getServerSupabase()
  if (!supabase) return null
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: perfil } = await supabase
    .from('perfis')
    .select('id, nome, role, empresa_id, empresas(status, nome)')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle()
  if (!perfil) return null
  const empresa = (Array.isArray(perfil.empresas) ? perfil.empresas[0] : perfil.empresas) as
    | { status: string; nome: string }
    | null
  const liberada = perfil.role === 'super_admin' || empresa?.status === 'ativo'
  if (!liberada) return null
  return { supabase, userId: auth.user.id, perfil, empresaId: perfil.empresa_id as string }
}
