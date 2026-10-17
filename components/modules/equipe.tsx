'use client'

import { useState } from 'react'
import { Check, Minus, Plus, Trash2, Users } from 'lucide-react'
import { ROLE_MODULES, useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Select, Switch } from '@/components/atendeai/ui'
import { initials, nowIso, uid } from '@/lib/format'
import type { ModuleKey, Role } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = { super_admin: 'Super Admin', empresa: 'Admin da Empresa', funcionario: 'Vendedor / Atendente' }
const MOD_LABEL: Partial<Record<ModuleKey, string>> = {
  divulgacao: 'Divulgação',
  inbox: 'Inbox',
  agenda: 'Agenda',
  vendas: 'Vendas PIX',
  pos_venda: 'Pós-Venda',
  funcionarios: 'Funcionários IA',
  whatsapp: 'WhatsApp',
  equipe: 'Equipe',
}

export function Equipe() {
  const { db, empresa, upsert, remove, notify } = useData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', role: 'funcionario' as Role })
  const membros = db.perfis.filter((p) => p.role !== 'super_admin')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Acessos"
        tone="captacao"
        title="Equipe & Acessos"
        description="Cadastre atendentes humanos que assumem conversas quando a IA transfere o atendimento."
        actions={
          <Btn tone="captacao" onClick={() => setOpen(true)}>
            <Plus /> Adicionar membro
          </Btn>
        }
      />
      <Card className="overflow-hidden">
        {membros.length === 0 ? (
          <Empty icon={<Users />} title="Nenhum membro" />
        ) : (
          <ul>
            {membros.map((p) => (
              <li key={p.id} className="flex flex-col gap-3 border-b border-border p-4 last:border-0 sm:flex-row sm:items-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">{initials(p.nome)}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{p.nome}</span>
                  <span className="truncate text-xs text-muted-foreground">{p.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`role-${p.id}`}>Permissão</label>
                  <Select id={`role-${p.id}`} value={p.role} onChange={(e) => upsert('perfis', { ...p, role: e.target.value as Role })} className="h-9 w-44">
                    <option value="empresa">Gestor da Empresa</option>
                    <option value="funcionario">Atendente</option>
                  </Select>
                  <Badge tone={p.ativo ? 'vendas' : 'neutral'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  <Switch checked={p.ativo} onChange={(v) => upsert('perfis', { ...p, ativo: v })} label={`Ativar ${p.nome}`} />
                  <Btn size="sm" variant="ghost" onClick={() => remove('perfis', p.id)} aria-label={`Remover ${p.nome}`}>
                    <Trash2 />
                  </Btn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-x-auto p-5">
        <h2 className="mb-4 font-medium">Matriz de permissões</h2>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-2 font-medium">Perfil</th>
              {Object.values(MOD_LABEL).map((l) => (
                <th key={l} className="p-2 text-center font-medium">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['empresa', 'funcionario'] as Role[]).map((r) => (
              <tr key={r} className="border-t border-border">
                <td className="p-2 font-medium">{ROLE_LABEL[r]}</td>
                {(Object.keys(MOD_LABEL) as ModuleKey[]).map((m) => (
                  <td key={m} className="p-2 text-center">
                    {ROLE_MODULES[r].includes(m) ? <Check className="mx-auto size-4 text-vendas" aria-label="Permitido" /> : <Minus className="mx-auto size-4 text-muted-foreground" aria-label="Bloqueado" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar membro da equipe">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            upsert('perfis', { id: uid(), auth_user_id: null, empresa_id: empresa.id, nome: form.nome, email: form.email, role: form.role, modulos: null, ativo: true, created_at: nowIso() })
            notify({ title: 'Membro adicionado', description: form.nome, tone: 'captacao' })
            setForm({ nome: '', email: '', role: 'funcionario' })
            setOpen(false)
          }}
        >
          <Field label="Nome">
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="E-mail">
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Permissão">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="funcionario">Atendente</option>
              <option value="empresa">Gestor da Empresa</option>
            </Select>
          </Field>
          <Btn type="submit" tone="captacao">
            <Plus /> Adicionar
          </Btn>
        </form>
      </Modal>
    </div>
  )
}
