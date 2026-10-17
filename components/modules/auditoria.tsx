'use client'

import { useMemo, useState } from 'react'
import { Bot, Cog, ScrollText, User } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Card, Empty, PageHeader, Tabs } from '@/components/atendeai/ui'
import { fmtDateTime } from '@/lib/format'
import type { Auditoria } from '@/lib/types'

const ATOR = {
  ia: { icon: Bot, tone: 'ia' as const, label: 'IA' },
  usuario: { icon: User, tone: 'captacao' as const, label: 'Usuário' },
  sistema: { icon: Cog, tone: 'neutral' as const, label: 'Sistema' },
}

export function AuditoriaModule() {
  const { db } = useData()
  const [filtro, setFiltro] = useState<'todos' | Auditoria['ator']>('todos')
  const lista = useMemo(
    () => [...db.auditoria].filter((a) => filtro === 'todos' || a.ator === filtro).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 300),
    [db.auditoria, filtro],
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Transparência"
        tone="neutral"
        title="Auditoria"
        description="Registro de tudo que a IA e a equipe fizeram: respostas, handoffs, cobranças, aprovações e mudanças de configuração."
      />
      <Tabs
        value={filtro}
        onChange={setFiltro}
        items={[
          { value: 'todos', label: 'Tudo' },
          { value: 'ia', label: 'IA' },
          { value: 'usuario', label: 'Usuários' },
          { value: 'sistema', label: 'Sistema' },
        ]}
      />
      <Card className="overflow-hidden">
        {lista.length === 0 ? (
          <Empty icon={<ScrollText />} title="Sem registros ainda" />
        ) : (
          <ol className="flex flex-col divide-y divide-border">
            {lista.map((a) => {
              const m = ATOR[a.ator]
              return (
                <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <time className="shrink-0 font-mono text-xs text-muted-foreground sm:w-36" dateTime={a.created_at}>
                    {fmtDateTime(a.created_at)}
                  </time>
                  <Badge tone={m.tone} className="self-start">
                    <m.icon className="size-3" /> {a.ator_nome || m.label}
                  </Badge>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-medium">{a.acao}</span>
                    {a.detalhe && <span className="text-sm leading-relaxed text-muted-foreground">{a.detalhe}</span>}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    </div>
  )
}
