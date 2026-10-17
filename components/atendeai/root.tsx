'use client'

import type { ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'
import { AtendeAIProvider, useAtendeAI } from './provider'
import { AppShell } from '@/components/app/app-shell'
import { PendingScreen } from '@/components/auth/pending-screen'
import { cn } from '@/lib/utils'

const toastBorder = {
  captacao: 'border-l-captacao',
  ia: 'border-l-ia',
  vendas: 'border-l-vendas',
  pos: 'border-l-pos',
  erro: 'border-l-destructive',
}

function Toaster() {
  const { toasts, dismiss } = useAtendeAI()
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto flex gap-3 rounded-xl border border-l-4 border-border bg-card p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2', toastBorder[t.tone])}>
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description && <p className="text-xs leading-relaxed text-muted-foreground">{t.description}</p>}
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  dismiss(t.id)
                }}
                className="mt-1 self-start rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70"
              >
                {t.action.label}
              </button>
            )}
          </div>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Fechar notificação" className="self-start text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function AtendeAIRoot({ children }: { children: ReactNode }) {
  return (
    <AtendeAIProvider>
      {children}
      <Toaster />
    </AtendeAIProvider>
  )
}

export function PainelGate() {
  const { ready, authState, logout } = useAtendeAI()
  if (authState === 'carregando' || (authState === 'ativo' && !ready) || (authState === 'demo' && !ready))
    return (
      <div className="flex min-h-dvh items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Carregando AtendeAI 360...
      </div>
    )
  if (authState === 'pendente' || authState === 'suspenso' || authState === 'sem_perfil') return <PendingScreen />
  if (authState === 'anonimo')
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground">
        Sessão expirada.
        <button type="button" className="text-foreground underline" onClick={logout}>
          Voltar ao início
        </button>
      </div>
    )
  return <AppShell />
}
