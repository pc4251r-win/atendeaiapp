import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const URL_ = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '')
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const isPainel = request.nextUrl.pathname.startsWith('/painel')
  const isAuthPage = ['/login', '/cadastro'].includes(request.nextUrl.pathname)
  const demo = request.cookies.get('atendeai_demo')?.value === '1'

  let logado = false
  if (URL_ && KEY && /^https?:\/\//.test(URL_)) {
    const supabase = createServerClient(URL_, KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })
    try {
      const { data } = await supabase.auth.getUser()
      logado = Boolean(data.user)
    } catch {
      logado = false
    }
  }

  if (isPainel && !logado && !demo) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  if (isAuthPage && logado) {
    const url = request.nextUrl.clone()
    url.pathname = '/painel'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/painel/:path*', '/login', '/cadastro'],
}
