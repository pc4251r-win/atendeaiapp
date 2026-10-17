import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'

export const metadata: Metadata = { title: 'Criar conta · AtendeAI 360' }

export default function CadastroPage() {
  return <AuthScreen mode="cadastro" />
}
