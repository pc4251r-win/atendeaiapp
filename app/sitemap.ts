import type { MetadataRoute } from 'next'
import { getPublicSupabase, siteUrl } from '@/lib/vitrine-server'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const fixas: MetadataRoute.Sitemap = [{ url: base, changeFrequency: 'weekly', priority: 1 }]
  const supabase = getPublicSupabase()
  if (!supabase) return fixas
  const { data } = await supabase.rpc('vitrines_publicadas')
  const sites = ((data ?? []) as { slug: string; updated_at: string }[]).map((s) => ({
    url: `${base}/s/${s.slug}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  return [...fixas, ...sites]
}
