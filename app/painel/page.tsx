import type { Metadata } from 'next'
import { PainelGate } from '@/components/atendeai/root'

export const metadata: Metadata = { title: 'Painel · AtendeAI 360', robots: { index: false } }

export default function PainelPage() {
  return <PainelGate />
}
