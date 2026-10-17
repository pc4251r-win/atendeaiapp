import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AtendeAIRoot } from '@/components/atendeai/root'
import './globals.css'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AtendeAI 360 — Ciclo completo de vendas no WhatsApp com IA',
  description:
    'Divulgação, atendimento com Funcionários de IA, CRM Kanban, agenda, cobrança PIX, NPS e recompra automática em uma plataforma multiempresa.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#090D16',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="bg-background">
      <body className="font-sans antialiased">
        <AtendeAIRoot>{children}</AtendeAIRoot>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
