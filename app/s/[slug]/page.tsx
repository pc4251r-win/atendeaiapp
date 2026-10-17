import type { Metadata } from 'next'
import { getVitrinePublica, siteUrl, urlImagemPublica } from '@/lib/vitrine-server'
import { sugestaoMetaDescription, sugestaoMetaTitle } from '@/lib/vitrine'
import { VitrineReal } from '@/components/vitrine/vitrine-real'
import { VitrineDemo } from '@/components/vitrine/vitrine-demo'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const v = await getVitrinePublica(slug)
  if (!v) return { title: 'Site', robots: { index: false } }
  const s = v.site
  const title = s.meta_title || sugestaoMetaTitle(v.nome, v.segmento, s.endereco)
  const description = s.meta_description || sugestaoMetaDescription(s, v.catalogo.map((c) => c.nome))
  const og = urlImagemPublica(slug, s.og_image_url || s.banner_url, 'og')
  const icon = urlImagemPublica(slug, s.favicon_url || s.logo_url, 'favicon')
  const canonical = `${siteUrl()}/s/${slug}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    icons: icon ? { icon } : undefined,
    openGraph: { title, description, url: canonical, siteName: v.nome, type: 'website', locale: 'pt_BR', images: og ? [{ url: og }] : undefined },
    twitter: { card: og ? 'summary_large_image' : 'summary', title, description, images: og ? [og] : undefined },
  }
}

export default async function SitePublicoPage({ params }: Props) {
  const { slug } = await params
  const v = await getVitrinePublica(slug)
  // Sem banco configurado (ou site não encontrado no banco), tenta o Modo Demonstração salvo neste navegador
  if (!v) return <VitrineDemo slug={slug} />
  return <VitrineReal data={v} />
}
