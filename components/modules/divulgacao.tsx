'use client'

import { useState } from 'react'
import { Camera as Instagram, Copy, Link2, MessageSquare, Pause, Play, Plus, Send, Sparkles, Trash2, UserPlus, Wand2 } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, copyText, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from '@/components/atendeai/ui'
import { gerarCopiesCampanha, precoComDesconto } from '@/lib/ai'
import { brl, CANAIS, nowIso, uid } from '@/lib/format'
import type { Canal } from '@/lib/types'

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function CampaignCreator({ onDone }: { onDone: () => void }) {
  const { db, empresa, upsert, notify } = useData()
  const itens = db.catalogo.filter((c) => c.ativo)
  const funcs = db.funcionarios_ia.filter((f) => f.ativo)
  const [catalogoId, setCatalogoId] = useState(itens[0]?.id ?? '')
  const [funcId, setFuncId] = useState(funcs.find((f) => f.funcao === 'campanha')?.id ?? funcs[0]?.id ?? '')
  const [desconto, setDesconto] = useState(15)
  const [canal, setCanal] = useState<Canal>('instagram_ads')
  const [titulo, setTitulo] = useState('')
  const [copies, setCopies] = useState<ReturnType<typeof gerarCopiesCampanha> | null>(null)
  const [copyFinal, setCopyFinal] = useState('')

  const item = itens.find((i) => i.id === catalogoId)
  const func = funcs.find((f) => f.id === funcId)
  const tituloFinal = titulo || (item ? `${item.nome} ${desconto}% OFF` : '')
  const link = `https://atendeai360.app/c/${slug(tituloFinal) || 'campanha'}`

  function gerar() {
    if (!item) return
    const c = gerarCopiesCampanha({ item, desconto, empresa, funcionario: func })
    setCopies(c)
    setCopyFinal(canal === 'whatsapp_lista' ? c.lista : canal === 'instagram_ads' ? c.instagram : c.status)
  }

  function salvar() {
    if (!item || !func) return
    upsert('campanhas_divulgacao', {
      id: uid(),
      empresa_id: empresa.id,
      titulo: tituloFinal,
      catalogo_id: item.id,
      funcionario_ia_id: func.id,
      canal,
      copy_anuncio: copyFinal,
      desconto_oferta: desconto,
      link_rastreavel: link,
      cliques: 0,
      leads_gerados: 0,
      vendas_geradas: 0,
      status: 'ativa',
      created_at: nowIso(),
    })
    notify({ title: 'Campanha criada e ativa', description: tituloFinal, tone: 'captacao' })
    onDone()
  }

  async function copiar(t: string) {
    if (await copyText(t)) notify({ title: 'Copiado para a área de transferência', tone: 'captacao' })
  }

  if (!itens.length || !funcs.length)
    return <Empty icon={<Sparkles />} title="Cadastre itens e Funcionários de IA" description="Você precisa de pelo menos 1 item no Catálogo e 1 Funcionário de IA ativo." />

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Produto / Serviço do Catálogo">
          <Select value={catalogoId} onChange={(e) => setCatalogoId(e.target.value)}>
            {itens.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome} — {brl(i.preco)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Funcionário de IA responsável">
          <Select value={funcId} onChange={(e) => setFuncId(e.target.value)}>
            {funcs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} — {f.titulo_cargo}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Desconto da oferta: ${desconto}%`} hint={item ? `De ${brl(item.preco)} por ${brl(precoComDesconto(item.preco, desconto))}` : undefined}>
          <input type="range" min={0} max={50} step={5} value={desconto} onChange={(e) => setDesconto(Number(e.target.value))} className="accent-captacao" />
        </Field>
        <Field label="Canal principal">
          <Select value={canal} onChange={(e) => setCanal(e.target.value as Canal)}>
            {CANAIS.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Título da campanha (opcional)">
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={tituloFinal} />
          </Field>
        </div>
      </div>
      <Btn tone="captacao" onClick={gerar}>
        <Wand2 /> Gerar textos persuasivos com IA
      </Btn>

      {copies && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { k: 'instagram', label: 'Instagram / Ads', icon: Instagram, text: copies.instagram },
              { k: 'status', label: 'Status do WhatsApp', icon: MessageSquare, text: copies.status },
              { k: 'lista', label: 'Disparo em Lista', icon: Send, text: copies.lista },
            ].map((c) => (
              <div key={c.k} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs font-medium text-captacao">
                    <c.icon className="size-3.5" /> {c.label}
                  </span>
                  <button type="button" onClick={() => copiar(c.text)} className="text-muted-foreground hover:text-foreground" aria-label={`Copiar texto ${c.label}`}>
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{c.text}</p>
                <Btn variant="ghost" size="sm" onClick={() => setCopyFinal(c.text)} className="self-start">
                  Usar como copy principal
                </Btn>
              </div>
            ))}
          </div>
          <Field label="Copy principal do anúncio">
            <Textarea value={copyFinal} onChange={(e) => setCopyFinal(e.target.value)} />
          </Field>
          <div className="flex items-center gap-2 rounded-lg border border-captacao/30 bg-captacao/10 p-3">
            <Link2 className="size-4 shrink-0 text-captacao" />
            <span className="flex-1 truncate font-mono text-xs">{link}</span>
            <Btn size="sm" variant="soft" tone="captacao" onClick={() => copiar(link)}>
              <Copy /> Copiar
            </Btn>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">Preview da Mini Página de Captura</span>
            <div className="mx-auto flex w-full max-w-xs flex-col gap-3 rounded-2xl border border-border bg-background p-5 text-center">
              <span className="text-xs text-muted-foreground">{empresa.nome}</span>
              <h3 className="text-balance text-lg font-semibold">{item?.nome}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{item?.descricao}</p>
              <p className="flex items-baseline justify-center gap-2">
                <span className="text-sm text-muted-foreground line-through">{item && brl(item.preco)}</span>
                <span className="text-2xl font-semibold text-vendas">{item && brl(precoComDesconto(item.preco, desconto))}</span>
              </p>
              <Badge tone="captacao" className="self-center">{desconto}% OFF por tempo limitado</Badge>
              <span className="rounded-lg bg-vendas py-2.5 text-sm font-semibold text-on-accent">Falar com {func?.nome} no WhatsApp</span>
            </div>
          </div>

          <Btn onClick={salvar}>
            <Plus /> Salvar e ativar campanha
          </Btn>
        </div>
      )}
    </div>
  )
}

export function Divulgacao() {
  const { db, upsert, remove, simularLeadCampanha } = useData()
  const [open, setOpen] = useState(false)
  const campanhas = [...db.campanhas_divulgacao].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Etapa 1"
        tone="captacao"
        title="Divulgação & Captação"
        description="Crie campanhas com IA e acompanhe cada clique. Ao simular um cliente, o lead entra direto no Inbox com a 1ª mensagem do Funcionário de IA."
        actions={
          <Btn tone="captacao" onClick={() => setOpen(true)}>
            <Sparkles /> Criar Campanha com IA
          </Btn>
        }
      />

      {campanhas.length === 0 ? (
        <Card>
          <Empty icon={<Sparkles />} title="Nenhuma campanha ainda" description="Crie sua primeira campanha com IA para começar a captar leads." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {campanhas.map((c) => {
            const item = db.catalogo.find((i) => i.id === c.catalogo_id)
            const func = db.funcionarios_ia.find((f) => f.id === c.funcionario_ia_id)
            const conv = c.leads_gerados ? ((c.vendas_geradas / c.leads_gerados) * 100).toFixed(1) : '0'
            return (
              <Card key={c.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold">{c.titulo}</h3>
                    <span className="text-xs text-muted-foreground">
                      {item?.nome ?? 'Item removido'} · IA: {func?.nome ?? '—'}
                    </span>
                  </div>
                  <Badge tone={c.status === 'ativa' ? 'vendas' : 'neutral'}>{c.status === 'ativa' ? 'Ativa' : 'Pausada'}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone="captacao">{CANAIS.find((x) => x.key === c.canal)?.label}</Badge>
                  <Badge tone="pos">{c.desconto_oferta}% OFF</Badge>
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{c.copy_anuncio}</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Cliques', c.cliques],
                    ['Leads', c.leads_gerados],
                    ['Vendas', c.vendas_geradas],
                    ['Conv.', `${conv}%`],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-border bg-background p-2">
                      <p className="text-[11px] text-muted-foreground">{l}</p>
                      <p className="font-semibold text-captacao">{v}</p>
                    </div>
                  ))}
                </div>
                <p className="truncate font-mono text-xs text-muted-foreground">{c.link_rastreavel}</p>
                <Btn tone="captacao" onClick={() => simularLeadCampanha(c.id)} disabled={c.status !== 'ativa'}>
                  <UserPlus /> Simular Cliente Vindo da Divulgação
                </Btn>
                <div className="flex gap-2">
                  <Btn variant="outline" size="sm" className="flex-1" onClick={() => upsert('campanhas_divulgacao', { ...c, status: c.status === 'ativa' ? 'pausada' : 'ativa' })}>
                    {c.status === 'ativa' ? <Pause /> : <Play />} {c.status === 'ativa' ? 'Pausar' : 'Ativar'}
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => remove('campanhas_divulgacao', c.id)} aria-label="Excluir campanha">
                    <Trash2 />
                  </Btn>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Criador de Campanhas com IA" description="Escolha a oferta e a IA escreve os textos para cada canal." size="lg">
        <CampaignCreator onDone={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
