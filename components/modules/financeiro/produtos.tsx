'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Search, Sparkles } from 'lucide-react'
import { Badge, Btn, Card, Empty, Field, Input, Modal, Select, Tabs } from '@/components/atendeai/ui'
import { analisarProdutos, detalharItem, MARGEM_ALVO, MARGEM_ATENCAO, precoIdeal, type LinhaProduto } from '@/lib/financeiro'
import { brl } from '@/lib/format'
import type { CatalogoItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { fmtPct, useFin } from './shared'

type Ordem = 'nome' | 'preco' | 'custo' | 'imposto' | 'comissao' | 'lucro' | 'margem' | 'markup'

const COLUNAS: { key: Ordem; label: string; alinha?: 'right' }[] = [
  { key: 'nome', label: 'Item' },
  { key: 'preco', label: 'Preço', alinha: 'right' },
  { key: 'custo', label: 'Custo', alinha: 'right' },
  { key: 'imposto', label: 'Imposto', alinha: 'right' },
  { key: 'comissao', label: 'Comissão', alinha: 'right' },
  { key: 'lucro', label: 'Lucro', alinha: 'right' },
  { key: 'margem', label: 'Margem', alinha: 'right' },
  { key: 'markup', label: 'Markup', alinha: 'right' },
]

const valorDe = (l: LinhaProduto, o: Ordem) => (o === 'nome' ? l.item.nome.toLowerCase() : o === 'markup' ? l.markup ?? -Infinity : l[o])

const paraNumero = (s: string) => {
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export function FinProdutos() {
  const { ctx, db, upsert, notify } = useFin()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<'todos' | 'servico' | 'produto'>('todos')
  const [foco, setFoco] = useState<'todos' | 'atencao' | 'negativa'>('todos')
  const [ordem, setOrdem] = useState<Ordem>('margem')
  const [asc, setAsc] = useState(true)
  const [editando, setEditando] = useState<CatalogoItem | null>(null)
  const [sugerindo, setSugerindo] = useState<LinhaProduto | null>(null)

  const linhas = useMemo(() => analisarProdutos(ctx), [ctx])
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return linhas
      .filter((l) => (tipo === 'todos' || l.item.tipo === tipo) && (!q || l.item.nome.toLowerCase().includes(q)))
      .filter((l) => (foco === 'todos' ? true : foco === 'negativa' ? l.margem < 0 : l.margem < MARGEM_ATENCAO))
      .sort((a, b) => {
        const va = valorDe(a, ordem)
        const vb = valorDe(b, ordem)
        const c = va < vb ? -1 : va > vb ? 1 : 0
        return asc ? c : -c
      })
  }, [linhas, busca, tipo, foco, ordem, asc])

  const alternar = (o: Ordem) => {
    if (o === ordem) setAsc(!asc)
    else {
      setOrdem(o)
      setAsc(o === 'nome' || o === 'margem')
    }
  }

  const aplicarPreco = () => {
    if (!sugerindo || sugerindo.precoIdeal == null) return
    upsert('catalogo', { ...sugerindo.item, preco: sugerindo.precoIdeal }, `Ajustou o preço de ${sugerindo.item.nome} para ${brl(sugerindo.precoIdeal)}`)
    notify(`Preço de ${sugerindo.item.nome} atualizado para ${brl(sugerindo.precoIdeal)}.`)
    setSugerindo(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item" className="pl-9" aria-label="Buscar item" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Tabs
              value={tipo}
              onChange={setTipo}
              items={[
                { value: 'todos', label: 'Todos' },
                { value: 'servico', label: 'Serviços' },
                { value: 'produto', label: 'Produtos' },
              ]}
            />
            <Tabs
              value={foco}
              onChange={setFoco}
              items={[
                { value: 'todos', label: 'Todas as margens' },
                { value: 'atencao', label: 'Abaixo de 15%' },
                { value: 'negativa', label: 'Negativas' },
              ]}
            />
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Custo = aquisição + mão de obra + custos variáveis. Margem = lucro ÷ preço. Markup = lucro ÷ custo total (inclui imposto e comissão). Margem-alvo para a sugestão de preço: {fmtPct(MARGEM_ALVO, 0)}.
        </p>
      </Card>

      <Card className="overflow-hidden">
        {visiveis.length === 0 ? (
          <Empty icon={<Search />} title="Nenhum item encontrado" description="Ajuste os filtros ou cadastre itens no Catálogo." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  {COLUNAS.map((c) => (
                    <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.alinha === 'right' ? 'text-right' : 'text-left')}>
                      <button type="button" onClick={() => alternar(c.key)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label={`Ordenar por ${c.label}`}>
                        {c.label}
                        {ordem === c.key && (asc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => {
                  const negativa = l.margem < 0
                  const atencao = !negativa && l.margem < MARGEM_ATENCAO
                  return (
                    <tr key={l.item.id} className={cn('border-b border-border/60 last:border-0', negativa && 'bg-destructive/5', atencao && 'bg-pos/5', !l.item.ativo && 'opacity-60')}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{l.item.nome}</span>
                          <span className="text-xs text-muted-foreground">
                            {l.item.tipo === 'servico' ? 'Serviço' : 'Produto'}
                            {l.vendas90 > 0 ? ` · ${l.vendas90} vendas em 90 dias` : ' · sem vendas em 90 dias'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{brl(l.preco)}</td>
                      <td className="px-4 py-3 text-right">{brl(l.custo)}</td>
                      <td className="px-4 py-3 text-right">{brl(l.imposto)}</td>
                      <td className="px-4 py-3 text-right">{brl(l.comissao)}</td>
                      <td className={cn('px-4 py-3 text-right font-semibold', negativa ? 'text-destructive' : 'text-vendas')}>{brl(l.lucro)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge tone={negativa ? 'erro' : atencao ? 'pos' : 'vendas'}>{fmtPct(l.margem)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{l.markup === null ? '—' : fmtPct(l.markup, 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Btn size="sm" variant="soft" tone="ia" onClick={() => setSugerindo(l)} disabled={l.precoIdeal === null} aria-label={`Sugerir preço ideal para ${l.item.nome}`}>
                            <Sparkles /> Preço ideal
                          </Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setEditando(l.item)} aria-label={`Editar custos de ${l.item.nome}`}>
                            <Pencil />
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editando && <EditarCustos key={editando.id} item={editando} onClose={() => setEditando(null)} />}

      <Modal open={Boolean(sugerindo)} onClose={() => setSugerindo(null)} title="Sugestão de preço ideal" description={sugerindo?.item.nome}>
        {sugerindo && sugerindo.precoIdeal != null && (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Para ter {fmtPct(MARGEM_ALVO, 0)} de margem líquida depois de custos, comissão e imposto ({fmtPct(ctx.aliq)}), o preço precisa ser:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <span className="text-xs text-muted-foreground">Preço atual</span>
                <p className="text-lg font-semibold">{brl(sugerindo.preco)}</p>
                <span className={cn('text-xs', sugerindo.margem < 0 ? 'text-destructive' : 'text-muted-foreground')}>Margem {fmtPct(sugerindo.margem)}</span>
              </div>
              <div className="rounded-lg border border-ia/30 bg-ia/10 p-3">
                <span className="text-xs text-ia">Preço ideal</span>
                <p className="text-lg font-semibold">{brl(sugerindo.precoIdeal)}</p>
                <span className="text-xs text-muted-foreground">Margem {fmtPct(MARGEM_ALVO, 0)}</span>
              </div>
            </div>
            {sugerindo.precoIdeal <= sugerindo.preco && <p className="text-xs text-vendas">Seu preço já está acima do ideal. Aplicar reduziria o preço; só faça isso se quiser ser mais competitivo.</p>}
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setSugerindo(null)}>
                Cancelar
              </Btn>
              <Btn tone="ia" onClick={aplicarPreco}>
                Aplicar no Catálogo
              </Btn>
            </div>
          </div>
        )}
      </Modal>
      <span className="sr-only">{db.catalogo.length} itens no catálogo</span>
    </div>
  )
}

function EditarCustos({ item, onClose }: { item: CatalogoItem; onClose: () => void }) {
  const { ctx, upsert, notify } = useFin()
  const [aq, setAq] = useState(String(item.custo_aquisicao ?? 0))
  const [mo, setMo] = useState(String(item.custo_mao_obra ?? 0))
  const [com, setCom] = useState(item.comissao_percentual == null ? '' : String(item.comissao_percentual))

  const rascunho: CatalogoItem = { ...item, custo_aquisicao: paraNumero(aq), custo_mao_obra: paraNumero(mo), comissao_percentual: com.trim() === '' ? null : paraNumero(com) }
  const d = detalharItem(item.preco, rascunho, ctx)
  const lucro = item.preco - d.aquisicao - d.maoObra - d.variaveis - d.comissao - d.imposto
  const ideal = precoIdeal(rascunho, ctx)

  const salvar = () => {
    upsert('catalogo', rascunho, `Atualizou custos de ${item.nome}`)
    notify(`Custos de ${item.nome} salvos.`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Custos do item" description={`${item.nome} · preço ${brl(item.preco)}`}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Custo de aquisição (R$)" hint="Material ou mercadoria">
            <Input inputMode="decimal" value={aq} onChange={(e) => setAq(e.target.value)} />
          </Field>
          <Field label="Mão de obra (R$)" hint="Custo do profissional">
            <Input inputMode="decimal" value={mo} onChange={(e) => setMo(e.target.value)} />
          </Field>
          <Field label="Comissão (%)" hint={`Vazio = padrão (${ctx.cfg.comissao_padrao}%)`}>
            <Input inputMode="decimal" value={com} onChange={(e) => setCom(e.target.value)} placeholder={String(ctx.cfg.comissao_padrao)} />
          </Field>
        </div>
        <div className="grid gap-2 rounded-lg border border-border bg-background p-3 text-sm sm:grid-cols-2">
          <span className="text-muted-foreground">Custos variáveis aplicados</span>
          <span className="text-right">{brl(d.variaveis)}</span>
          <span className="text-muted-foreground">Comissão</span>
          <span className="text-right">{brl(d.comissao)}</span>
          <span className="text-muted-foreground">Imposto</span>
          <span className="text-right">{brl(d.imposto)}</span>
          <span className="font-medium">Lucro líquido por venda</span>
          <span className={cn('text-right font-semibold', lucro < 0 ? 'text-destructive' : 'text-vendas')}>
            {brl(lucro)} ({fmtPct(item.preco > 0 ? lucro / item.preco : 0)})
          </span>
          {ideal !== null && (
            <>
              <span className="text-muted-foreground">Preço ideal ({fmtPct(MARGEM_ALVO, 0)} de margem)</span>
              <span className="text-right">{brl(ideal)}</span>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn onClick={salvar}>Salvar custos</Btn>
        </div>
      </div>
    </Modal>
  )
}
