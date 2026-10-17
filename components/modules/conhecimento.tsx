'use client'

import { useState } from 'react'
import { BookOpen, Check, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Select, Tabs, Textarea } from '@/components/atendeai/ui'
import { nowIso, uid } from '@/lib/format'
import type { BaseConhecimento, CategoriaConhecimento } from '@/lib/types'

const CATS: Record<CategoriaConhecimento, string> = {
  faq: 'FAQ',
  horarios: 'Horários',
  regras: 'Regras',
  politicas: 'Políticas',
  produto: 'Produtos',
}

export function Conhecimento() {
  const { db, empresa, upsert, remove, notify, session } = useData()
  const [tab, setTab] = useState<'todos' | CategoriaConhecimento>('todos')
  const [edit, setEdit] = useState<BaseConhecimento | null>(null)
  const canEdit = session.role !== 'funcionario'
  const sugeridos = db.base_conhecimento.filter((k) => k.status === 'sugerido')
  const ativos = db.base_conhecimento.filter((k) => k.status === 'ativo' && (tab === 'todos' || k.categoria === tab))

  const novo = (): BaseConhecimento => ({ id: '', empresa_id: empresa.id, categoria: 'faq', titulo: '', conteudo: '', origem: 'manual', status: 'ativo', created_at: '' })

  function salvar() {
    if (!edit?.titulo.trim() || !edit.conteudo.trim()) return
    upsert('base_conhecimento', { ...edit, id: edit.id || uid(), created_at: edit.created_at || nowIso() })
    notify({ title: 'Conhecimento salvo', description: 'Os agentes já usam esta informação.', tone: 'ia' })
    setEdit(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Cérebro dos agentes"
        tone="ia"
        title="Base de Conhecimento"
        description="FAQ, horários, regras e políticas que a IA consulta antes de responder. Ela nunca inventa preço ou regra fora daqui ou do Catálogo."
        actions={
          canEdit && (
            <Btn tone="ia" onClick={() => setEdit(novo())}>
              <Plus /> Novo conhecimento
            </Btn>
          )
        }
      />

      {sugeridos.length > 0 && (
        <Card className="flex flex-col gap-3 border-ia/40 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-ia" />
            <h2 className="font-semibold">Base Viva: a IA aprendeu {sugeridos.length} resposta(s) com atendimentos humanos</h2>
          </div>
          <ul className="flex flex-col gap-2">
            {sugeridos.map((k) => (
              <li key={k.id} className="flex flex-col gap-3 rounded-lg bg-secondary/50 p-3 md:flex-row md:items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium">{k.titulo}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{k.conteudo}</p>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Btn size="sm" tone="ia" onClick={() => upsert('base_conhecimento', { ...k, status: 'ativo' })}>
                      <Check /> Adicionar ao conhecimento
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => remove('base_conhecimento', k.id)} aria-label="Descartar sugestão">
                      <X />
                    </Btn>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        items={[{ value: 'todos', label: 'Todos' }, ...(Object.keys(CATS) as CategoriaConhecimento[]).map((c) => ({ value: c, label: CATS[c] }))]}
      />

      {ativos.length === 0 ? (
        <Card>
          <Empty icon={<BookOpen />} title="Nada cadastrado nesta categoria" description="Adicione horários, formas de pagamento, política de cancelamento e dúvidas frequentes." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ativos.map((k) => (
            <Card key={k.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1.5">
                    <Badge tone="ia">{CATS[k.categoria]}</Badge>
                    {k.origem === 'aprendido' && <Badge tone="pos">aprendido</Badge>}
                  </div>
                  <h3 className="font-medium">{k.titulo}</h3>
                </div>
                {canEdit && (
                  <div className="flex">
                    <Btn size="sm" variant="ghost" onClick={() => setEdit(k)} aria-label={`Editar ${k.titulo}`}>
                      <Pencil />
                    </Btn>
                    <Btn size="sm" variant="ghost" onClick={() => remove('base_conhecimento', k.id)} aria-label={`Excluir ${k.titulo}`}>
                      <Trash2 />
                    </Btn>
                  </div>
                )}
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{k.conteudo}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Editar conhecimento' : 'Novo conhecimento'}>
        {edit && (
          <div className="flex flex-col gap-4">
            <Field label="Categoria">
              <Select value={edit.categoria} onChange={(e) => setEdit({ ...edit, categoria: e.target.value as CategoriaConhecimento })}>
                {(Object.keys(CATS) as CategoriaConhecimento[]).map((c) => (
                  <option key={c} value={c}>
                    {CATS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Título / pergunta">
              <Input value={edit.titulo} onChange={(e) => setEdit({ ...edit, titulo: e.target.value })} placeholder="Vocês aceitam cartão?" />
            </Field>
            <Field label="Resposta">
              <Textarea value={edit.conteudo} onChange={(e) => setEdit({ ...edit, conteudo: e.target.value })} placeholder="Sim, aceitamos PIX, débito e crédito em até 3x sem juros." />
            </Field>
            <Btn tone="ia" onClick={salvar}>
              Salvar
            </Btn>
          </div>
        )}
      </Modal>
    </div>
  )
}
