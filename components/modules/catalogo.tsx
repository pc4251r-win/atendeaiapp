'use client'

import { useState } from 'react'
import { Package, Pencil, Plus, Scissors, ShoppingBag, Trash2 } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Select, Switch, Textarea } from '@/components/atendeai/ui'
import { brl, nowIso, uid } from '@/lib/format'
import type { CatalogoItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Catalogo() {
  const { db, empresa, upsert, remove, notify, session } = useData()
  const [edit, setEdit] = useState<CatalogoItem | null>(null)
  const canEdit = session.role !== 'funcionario'

  const novo = (): CatalogoItem => ({
    id: '',
    empresa_id: empresa.id,
    nome: '',
    tipo: 'servico',
    preco: 0,
    duracao_minutos: 60,
    dias_retorno_pos_venda: 30,
    descricao: '',
    ativo: true,
    created_at: '',
  })

  function salvar() {
    if (!edit || !edit.nome || edit.preco < 0) return
    upsert('catalogo', { ...edit, id: edit.id || uid(), created_at: edit.created_at || nowIso() })
    notify({ title: 'Catálogo atualizado', description: edit.nome, tone: 'vendas' })
    setEdit(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Ofertas"
        title="Catálogo de Ofertas"
        description="Os Funcionários de IA usam estes preços nas conversas. O Prazo de Retorno define quando o lembrete de recompra é disparado."
        actions={
          canEdit && (
            <Btn onClick={() => setEdit(novo())}>
              <Plus /> Novo item
            </Btn>
          )
        }
      />
      <Card className="overflow-hidden">
        {db.catalogo.length === 0 ? (
          <Empty icon={<ShoppingBag />} title="Catálogo vazio" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Tipo</th>
                  <th className="p-3 font-medium">Preço</th>
                  <th className="p-3 font-medium">Duração</th>
                  <th className="p-3 font-medium">Retorno Pós-Venda</th>
                  <th className="p-3 font-medium">Ativo</th>
                  <th className="p-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {db.catalogo.map((c) => (
                  <tr key={c.id} className={cn('border-b border-border last:border-0', !c.ativo && 'opacity-60')}>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{c.nome}</span>
                        <span className="line-clamp-1 text-xs text-muted-foreground">{c.descricao}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge tone={c.tipo === 'servico' ? 'captacao' : 'ia'}>
                        {c.tipo === 'servico' ? <Scissors className="size-3" /> : <Package className="size-3" />}
                        {c.tipo === 'servico' ? 'Serviço' : 'Produto'}
                      </Badge>
                    </td>
                    <td className="p-3 font-semibold text-vendas">{brl(c.preco)}</td>
                    <td className="p-3 text-muted-foreground">{c.duracao_minutos ? `${c.duracao_minutos} min` : '—'}</td>
                    <td className="p-3">
                      <Badge tone="pos">{c.dias_retorno_pos_venda} dias</Badge>
                    </td>
                    <td className="p-3">
                      <Switch checked={c.ativo} onChange={(v) => canEdit && upsert('catalogo', { ...c, ativo: v })} label={`Ativar ${c.nome}`} />
                    </td>
                    <td className="p-3">
                      {canEdit && (
                        <div className="flex justify-end gap-1">
                          <Btn size="sm" variant="ghost" onClick={() => setEdit(c)} aria-label="Editar">
                            <Pencil />
                          </Btn>
                          <Btn size="sm" variant="ghost" onClick={() => remove('catalogo', c.id)} aria-label="Excluir">
                            <Trash2 />
                          </Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar item' : 'Novo item do catálogo'}>
        {edit && (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              salvar()
            }}
          >
            <div className="sm:col-span-2">
              <Field label="Nome">
                <Input required value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
              </Field>
            </div>
            <Field label="Tipo">
              <Select value={edit.tipo} onChange={(e) => setEdit({ ...edit, tipo: e.target.value as CatalogoItem['tipo'] })}>
                <option value="servico">Serviço</option>
                <option value="produto">Produto</option>
              </Select>
            </Field>
            <Field label="Preço (R$)">
              <Input required type="number" min={0} step="0.01" value={edit.preco} onChange={(e) => setEdit({ ...edit, preco: Number(e.target.value) })} />
            </Field>
            <Field label="Duração (min)">
              <Input type="number" min={0} value={edit.duracao_minutos} onChange={(e) => setEdit({ ...edit, duracao_minutos: Number(e.target.value) })} />
            </Field>
            <Field label="Prazo de Retorno Pós-Venda (dias)" hint="Ex: 30 dias para lembrete de recompra">
              <Input type="number" min={1} value={edit.dias_retorno_pos_venda} onChange={(e) => setEdit({ ...edit, dias_retorno_pos_venda: Number(e.target.value) })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Descrição">
                <Textarea value={edit.descricao} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} />
              </Field>
            </div>
            <Btn type="submit" className="sm:col-span-2">
              Salvar item
            </Btn>
          </form>
        )}
      </Modal>
    </div>
  )
}
