import type { Metadata } from 'next'
import { AuthScreen } from '@/components/auth/auth-screen'

export const metadata: Metadata = { title: 'Entrar · AtendeAI 360' }

export default function LoginPage() {
  return <AuthScreen mode="login" />
}
