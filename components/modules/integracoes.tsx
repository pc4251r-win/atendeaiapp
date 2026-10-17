'use client'

import { useState } from 'react'
import { CalendarDays, CreditCard, Package, Plug, Webhook, Users } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Field, Input, Modal, PageHeader } from '@/components/atendeai/ui'
import { nowIso, uid } from '@/lib/format'
import type { Integracao } from '@/lib/types'

interface Catalogo {
  provedor: string
  categoria: Integracao['categoria']
  descricao: string
  campos: { key: string; label: string; placeholder: string }[]
  icon: typeof Plug
}

const DISPONIVEIS: Catalogo[] = [
  { provedor: 'Google Calendar', categoria: 'calendario', icon: CalendarDays, descricao: 'Sincroniza a Agenda Inteligente com o calendário da equipe.', campos: [{ key: 'calendar_id', label: 'ID do calendário', placeholder: 'agenda@empresa.com' }] },
  { provedor: 'Mercado Pago', categoria: 'pagamento', icon: CreditCard, descricao: 'Cartão e PIX com confirmação automática via webhook.', campos: [{ key: 'conta', label: 'E-mail da conta', placeholder: 'financeiro@empresa.com' }] },
  { provedor: 'Stripe', categoria: 'pagamento', icon: CreditCard, descricao: 'Links de pagamento e assinaturas recorrentes.', campos: [{ key: 'conta', label: 'ID da conta', placeholder: 'acct_...' }] },
  { provedor: 'RD Station', categoria: 'crm', icon: Users, descricao: 'Envia leads qualificados e eventos de conversão.', campos: [{ key: 'funil', label: 'Funil de destino', placeholder: 'Funil principal' }] },
  { provedor: 'HubSpot', categoria: 'crm', icon: Users, descricao: 'Sincroniza contatos e negócios do CRM.', campos: [{ key: 'pipeline', label: 'Pipeline', placeholder: 'Vendas' }] },
  { provedor: 'Bling', categoria: 'estoque', icon: Package, descricao: 'A IA consulta o estoque antes de oferecer um produto.', campos: [{ key: 'deposito', label: 'Depósito', placeholder: 'Geral' }] },
  { provedor: 'Webhook personalizado', categoria: 'webhook', icon: Webhook, descricao: 'Recebe eventos (lead, venda, agendamento) em qualquer sistema.', campos: [{ key: 'url', label: 'URL de destino (https)', placeholder: 'https://seu-sistema.com/webhook' }] },
]

export function Integracoes() {
  const { db, empresa, upsert, notify, session } = useData()
  const [sel, setSel] = useState<{ cat: Catalogo; config: Record<string, string> } | null>(null)
  const canEdit = session.role !== 'funcionario'
  const atual = (p: string) => db.integracoes.find((i) => i.provedor === p)

  function salvar() {
    if (!sel) return
    if (sel.cat.categoria === 'webhook' && !/^https:\/\//.test(sel.config.url ?? '')) {
      notify({ title: 'URL inválida', description: 'Use uma URL https.', tone: 'erro' })
      return
    }
    const ex = atual(sel.cat.provedor)
    upsert('integracoes', {
      id: ex?.id ?? uid(),
      empresa_id: empresa.id,
      provedor: sel.cat.provedor,
      categoria: sel.cat.categoria,
      status: 'conectado',
      config: sel.config,
      updated_at: nowIso(),
    })
    notify({ title: `${sel.cat.provedor} conectado`, tone: 'captacao' })
    setSel(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Ecossistema"
        tone="captacao"
        title="Integrações"
        description="Conecte o AtendeAI às ferramentas que você já usa. Chaves secretas ficam apenas no servidor (variáveis de ambiente) e nunca são exibidas no navegador."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DISPONIVEIS.map((c) => {
          const i = atual(c.provedor)
          const on = i?.status === 'conectado'
          return (
            <Card key={c.provedor} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary">
                  <c.icon className="size-5" />
                </span>
                <Badge tone={on ? 'vendas' : 'neutral'}>{on ? 'Conectado' : 'Desconectado'}</Badge>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <h2 className="font-semibold">{c.provedor}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.descricao}</p>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <Btn size="sm" variant={on ? 'outline' : 'solid'} tone="captacao" className="flex-1" onClick={() => setSel({ cat: c, config: { ...(i?.config ?? {}) } })}>
                    {on ? 'Configurar' : 'Conectar'}
                  </Btn>
                  {on && i && (
                    <Btn size="sm" variant="ghost" onClick={() => upsert('integracoes', { ...i, status: 'desconectado', updated_at: nowIso() })}>
                      Desconectar
                    </Btn>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Modal open={Boolean(sel)} onClose={() => setSel(null)} title={`Conectar ${sel?.cat.provedor ?? ''}`} description="Só configurações não sensíveis ficam aqui. O token de acesso é configurado pelo administrador nas variáveis do servidor.">
        {sel && (
          <div className="flex flex-col gap-4">
            {sel.cat.campos.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input value={sel.config[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => setSel({ ...sel, config: { ...sel.config, [f.key]: e.target.value } })} />
              </Field>
            ))}
            <Btn tone="captacao" onClick={salvar}>
              Salvar e conectar
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  )
}
