'use client'

import { useState } from 'react'
import { Clock, Loader2, LogOut, Ban, RefreshCw } from 'lucide-react'
import { useAtendeAI } from '@/components/atendeai/provider'
import { Btn, Card } from '@/components/atendeai/ui'
import { Logo } from '@/components/atendeai/logo'

export function PendingScreen() {
  const { authState, empresa, session, recarregar, logout } = useAtendeAI()
  const [checando, setChecando] = useState(false)
  const suspenso = authState === 'suspenso'
  const semPerfil = authState === 'sem_perfil'

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Logo />
      <Card className="flex w-full max-w-md flex-col items-center gap-5 p-8 text-center">
        <span className={`flex size-14 items-center justify-center rounded-full ${suspenso ? 'bg-destructive/15 text-destructive' : 'bg-ia/15 text-ia'}`}>
          {suspenso ? <Ban className="size-7" /> : <Clock className="size-7" />}
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-balance">
            {suspenso ? 'Conta suspensa' : semPerfil ? 'Perfil não encontrado' : 'Conta em análise'}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {suspenso
              ? `O acesso de ${empresa?.nome ?? 'sua empresa'} foi suspenso. Fale com o suporte para regularizar.`
              : semPerfil
                ? 'Seu usuário existe, mas não há um perfil vinculado. Verifique se o script SQL do AtendeAI foi executado no Supabase.'
                : `Recebemos o cadastro de ${empresa?.nome ?? 'sua empresa'}. Assim que o administrador aprovar, o painel é liberado automaticamente.`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Conectado como {session.userEmail}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {!suspenso && (
            <Btn
              className="flex-1"
              disabled={checando}
              onClick={async () => {
                setChecando(true)
                await recarregar().finally(() => setChecando(false))
              }}
            >
              {checando ? <Loader2 className="animate-spin" /> : <RefreshCw />} Verificar aprovação
            </Btn>
          )}
          <Btn variant="outline" className="flex-1" onClick={logout}>
            <LogOut /> Sair
          </Btn>
        </div>
      </Card>
    </main>
  )
}
