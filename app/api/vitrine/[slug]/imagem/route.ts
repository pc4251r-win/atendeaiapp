import { getVitrinePublica } from '@/lib/vitrine-server'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tipo = new URL(req.url).searchParams.get('tipo')
  const v = await getVitrinePublica(slug)
  if (!v) return new Response('Not found', { status: 404 })
  const valor = tipo === 'favicon' ? v.site.favicon_url || v.site.logo_url : v.site.og_image_url || v.site.banner_url
  const m = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/.exec(valor)
  if (!m) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(m[2], 'base64'), {
    headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=3600, s-maxage=3600', 'X-Content-Type-Options': 'nosniff' },
  })
}
