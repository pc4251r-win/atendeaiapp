import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/vitrine-server'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/s/'], disallow: ['/painel', '/api/', '/login', '/cadastro'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  }
}
