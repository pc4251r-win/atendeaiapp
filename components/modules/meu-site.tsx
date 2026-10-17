'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Globe, ImagePlus, Inbox, Monitor, Plus, Smartphone, Star, Trash2 } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, PageHeader, Stat, Switch, Tabs, Textarea } from '@/components/atendeai/ui'
import { VitrineView } from '@/components/vitrine/vitrine-view'
import { cn } from '@/lib/utils'
import { ACAO_LABEL, PALETAS, SECOES, TEMPLATES, processarImagem, serieDemonstracao, sugestaoMetaDescription, sugestaoMetaTitle, type VitrinePublica } from '@/lib/vitrine'
import type { SiteVitrine, TemplateSite } from '@/lib/types'

type Aba = 'conteudo' | 'aparencia' | 'secoes' | 'midia' | 'seo' | 'analytics' | 'leads'

const uid = () => crypto.randomUUID()

export function MeuSite() {
  const { db, empresa, ativarSite } = useData()
  const site = db.sites_vitrine.find((s) => s.empresa_id === empresa?.id)
  if (!empresa) return null
  if (!site) return <Ativacao onAtivar={ativarSite} />
  return <Editor key={site.id} site={site} />
}

function Ativacao({ onAtivar }: { onAtivar: (t: TemplateSite) => Promise<void> | void }) {
  const [tpl, setTpl] = useState<TemplateSite>('estetica')
  const [criando, setCriando] = useState(false)
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Meu Site"
        tone="captacao"
        title="Sua vitrine na internet, ligada ao WhatsApp"
        description="Um site público com seus serviços, preços e botão de WhatsApp. Cada visita e cada pedido chega direto no Inbox e no CRM."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTpl(t.key)}
            aria-pressed={tpl === t.key}
            className={cn(
              'flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30',
              tpl === t.key ? 'border-captacao ring-2 ring-captacao/30' : 'border-border',
            )}
          >
            <div className="flex h-20 items-end gap-1.5 overflow-hidden rounded-lg p-2" style={{ background: t.claro.bg, borderRadius: t.raio }}>
              <span className="h-full w-1/3 rounded" style={{ background: t.cor, opacity: 0.85 }} />
              <span className="flex h-full flex-1 flex-col justify-end gap-1">
                <span className="h-2 w-3/4 rounded" style={{ background: t.claro.fg, opacity: 0.7 }} />
                <span className="h-2 w-1/2 rounded" style={{ background: t.claro.muted, opacity: 0.5 }} />
                <span className="h-3 w-1/3 rounded" style={{ background: t.cor }} />
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{t.nome}</span>
              {tpl === t.key && <Check className="size-4 text-captacao" aria-hidden />}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t.descricao}</p>
          </button>
        ))}
      </div>
      <div>
        <Btn
          tone="captacao"
          size="lg"
          disabled={criando}
          onClick={async () => {
            setCriando(true)
            await onAtivar(tpl)
            setCriando(false)
          }}
        >
          <Globe /> {criando ? 'Criando…' : 'Criar meu site'}
        </Btn>
      </div>
    </div>
  )
}

function Editor({ site: inicial }: { site: SiteVitrine }) {
  const { db, empresa, salvarSite, verificarSlug, upsert, remove, notify, abrirNoInbox } = useData()
  const [site, setSite] = useState(inicial)
  const [aba, setAba] = useState<Aba>('conteudo')
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile')
  const [slugInfo, setSlugInfo] = useState<{ ok: boolean; sugestao: string } | null>(null)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => setSite(inicial), [inicial])

  const sujo = JSON.stringify(site) !== JSON.stringify(inicial)
  const set = <K extends keyof SiteVitrine>(k: K, v: SiteVitrine[K]) => setSite((s) => ({ ...s, [k]: v }))

  const catalogo = useMemo(() => db.catalogo.filter((c) => c.empresa_id === site.empresa_id && c.ativo), [db.catalogo, site.empresa_id])
  const galeria = db.sites_galeria.filter((g) => g.empresa_id === site.empresa_id)
  const depoimentos = db.sites_depoimentos.filter((d) => d.empresa_id === site.empresa_id)

  const preview: VitrinePublica = {
    empresa_id: site.empresa_id,
    nome: empresa?.nome ?? '',
    segmento: empresa?.segmento ?? '',
    site,
    catalogo: catalogo.map(({ id, nome, tipo, preco, duracao_minutos, descricao }) => ({ id, nome, tipo, preco, duracao_minutos, descricao })),
    galeria,
    depoimentos,
  }

  const url = typeof window !== 'undefined' ? `${window.location.origin}/s/${inicial.slug}` : `/s/${inicial.slug}`

  useEffect(() => {
    if (site.slug === inicial.slug) return setSlugInfo(null)
    const t = setTimeout(async () => {
      const r = await verificarSlug(site.slug, site.id)
      setSlugInfo({ ok: r.disponivel, sugestao: r.sugestao })
    }, 400)
    return () => clearTimeout(t)
  }, [site.slug, site.id, inicial.slug, verificarSlug])

  const salvar = () => {
    if (slugInfo && !slugInfo.ok) return notify({ title: 'Endereço em uso', description: `Sugestão: ${slugInfo.sugestao}`, tone: 'erro' })
    salvarSite(site)
    notify({ title: 'Site salvo', tone: 'vendas' })
  }

  const publicar = (publicado: boolean) => {
    if (publicado && !site.whatsapp) return notify({ title: 'Informe o WhatsApp', description: 'O botão principal do site precisa de um número.', tone: 'erro' })
    const novo = { ...site, publicado }
    setSite(novo)
    salvarSite(novo, publicado ? 'Publicou o Meu Site' : 'Despublicou o Meu Site')
    notify({ title: publicado ? 'Site no ar!' : 'Site despublicado', description: publicado ? url : undefined, tone: 'vendas' })
  }

  const enviarImagem = async (file: File | undefined, campo: 'logo_url' | 'banner_url' | 'og_image_url' | 'favicon_url') => {
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return notify({ title: 'Imagem muito grande', description: 'Use até 8 MB.', tone: 'erro' })
    const opts = {
      logo_url: { maxLado: 320, formato: 'image/png' as const },
      favicon_url: { maxLado: 64, aspecto: 1, formato: 'image/png' as const },
      banner_url: { maxLado: 1600, aspecto: 16 / 9 },
      og_image_url: { maxLado: 1200, aspecto: 1200 / 630 },
    }[campo]
    try {
      set(campo, await processarImagem(file, opts))
    } catch {
      notify({ title: 'Não foi possível ler a imagem', tone: 'erro' })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Meu Site"
        tone="captacao"
        title={empresa?.nome ?? 'Meu Site'}
        description="Edite à esquerda e veja o resultado ao lado. Salve para aplicar no site público."
        actions={
          <>
            <Badge tone={inicial.publicado ? 'vendas' : 'neutral'}>{inicial.publicado ? 'Publicado' : 'Rascunho'}</Badge>
            <Btn variant="outline" size="sm" onClick={() => window.open(`/s/${inicial.slug}`, '_blank', 'noopener')}>
              <ExternalLink /> Abrir site
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(url)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 1500)
              }}
            >
              {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado' : 'Copiar link'}
            </Btn>
            <Btn tone="captacao" variant="soft" size="sm" onClick={() => publicar(!inicial.publicado)}>
              {inicial.publicado ? 'Despublicar' : 'Publicar'}
            </Btn>
            <Btn tone="captacao" size="sm" disabled={!sujo} onClick={salvar}>
              Salvar
            </Btn>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="overflow-x-auto">
            <Tabs
              value={aba}
              onChange={setAba}
              items={[
                { value: 'conteudo', label: 'Conteúdo' },
                { value: 'aparencia', label: 'Aparência' },
                { value: 'secoes', label: 'Seções' },
                { value: 'midia', label: 'Galeria' },
                { value: 'seo', label: 'SEO' },
                { value: 'analytics', label: 'Analytics' },
                { value: 'leads', label: 'Leads' },
              ]}
            />
          </div>

          {aba === 'conteudo' && (
            <Card className="flex flex-col gap-4 p-5">
              <Field label="Endereço do site" hint={slugInfo ? (slugInfo.ok ? 'Disponível' : `Em uso. Sugestão: ${slugInfo.sugestao}`) : `${typeof window !== 'undefined' ? window.location.host : ''}/s/${site.slug}`}>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">/s/</span>
                  <Input value={site.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} aria-invalid={slugInfo ? !slugInfo.ok : undefined} />
                  {slugInfo && !slugInfo.ok && (
                    <Btn size="sm" variant="outline" onClick={() => set('slug', slugInfo.sugestao)}>
                      Usar sugestão
                    </Btn>
                  )}
                </div>
              </Field>
              <Field label="Título principal">
                <Input value={site.headline} maxLength={80} onChange={(e) => set('headline', e.target.value)} />
              </Field>
              <Field label="Subtítulo">
                <Input value={site.subtitulo} maxLength={140} onChange={(e) => set('subtitulo', e.target.value)} />
              </Field>
              <Field label="Sobre o negócio">
                <Textarea rows={4} value={site.sobre} maxLength={1200} onChange={(e) => set('sobre', e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp (com DDD)">
                  <Input inputMode="tel" value={site.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="11999998888" />
                </Field>
                <Field label="Telefone">
                  <Input inputMode="tel" value={site.telefone} onChange={(e) => set('telefone', e.target.value)} />
                </Field>
              </div>
              <Field label="Endereço" hint="Usado no mapa e no título do Google">
                <Input value={site.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, número - Bairro, Cidade - UF" />
              </Field>
              <Field label="Horário de funcionamento">
                <Input value={site.horario_funcionamento} onChange={(e) => set('horario_funcionamento', e.target.value)} placeholder="Seg a Sex 9h-19h · Sáb 9h-14h" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Instagram">
                  <Input value={site.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="@seunegocio" />
                </Field>
                <Field label="Facebook">
                  <Input value={site.facebook} onChange={(e) => set('facebook', e.target.value)} />
                </Field>
                <Field label="TikTok">
                  <Input value={site.tiktok} onChange={(e) => set('tiktok', e.target.value)} />
                </Field>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Os serviços e preços vêm do <strong className="font-medium text-foreground">Catálogo de Ofertas</strong> ({catalogo.length} ativos).
              </p>
            </Card>
          )}

          {aba === 'aparencia' && (
            <Card className="flex flex-col gap-5 p-5">
              <Field label="Modelo">
                <div className="grid gap-2 sm:grid-cols-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      aria-pressed={site.template === t.key}
                      onClick={() => setSite((s) => ({ ...s, template: t.key, cor_destaque: t.cor }))}
                      className={cn('flex items-center gap-3 rounded-lg border p-3 text-left text-sm', site.template === t.key ? 'border-captacao bg-captacao/5' : 'border-border hover:bg-secondary')}
                    >
                      <span className="size-6 shrink-0 rounded-full" style={{ background: t.cor }} aria-hidden />
                      <span className="font-medium">{t.nome}</span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Cor de destaque">
                <div className="flex flex-wrap items-center gap-2">
                  {PALETAS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      aria-pressed={site.cor_destaque === c}
                      onClick={() => set('cor_destaque', c)}
                      className={cn('size-8 rounded-full ring-offset-2 ring-offset-card', site.cor_destaque === c && 'ring-2 ring-foreground')}
                      style={{ background: c }}
                    />
                  ))}
                  <input type="color" aria-label="Cor personalizada" value={site.cor_destaque} onChange={(e) => set('cor_destaque', e.target.value)} className="size-8 cursor-pointer rounded-full border border-border bg-transparent" />
                </div>
              </Field>
              <Switch checked={site.modo_escuro} onChange={(v) => set('modo_escuro', v)} label="Modo escuro" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Upload label="Logo" valor={site.logo_url} onFile={(f) => enviarImagem(f, 'logo_url')} onLimpar={() => set('logo_url', '')} />
                <Upload label="Banner (16:9)" valor={site.banner_url} onFile={(f) => enviarImagem(f, 'banner_url')} onLimpar={() => set('banner_url', '')} />
              </div>
            </Card>
          )}

          {aba === 'secoes' && (
            <Card className="flex flex-col gap-4 p-5">
              {SECOES.map((s) => (
                <Switch key={s.key} checked={site.secoes_ativas[s.key]} onChange={(v) => set('secoes_ativas', { ...site.secoes_ativas, [s.key]: v })} label={s.label} />
              ))}
              {site.secoes_ativas.faq && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  <span className="text-sm font-medium">Perguntas frequentes</span>
                  {site.faq.map((f, i) => (
                    <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                      <Input aria-label="Pergunta" value={f.pergunta} placeholder="Pergunta" onChange={(e) => set('faq', site.faq.map((x, j) => (j === i ? { ...x, pergunta: e.target.value } : x)))} />
                      <Textarea aria-label="Resposta" rows={2} value={f.resposta} placeholder="Resposta" onChange={(e) => set('faq', site.faq.map((x, j) => (j === i ? { ...x, resposta: e.target.value } : x)))} />
                      <Btn size="sm" variant="ghost" className="self-start" onClick={() => set('faq', site.faq.filter((_, j) => j !== i))}>
                        <Trash2 /> Remover
                      </Btn>
                    </div>
                  ))}
                  <Btn size="sm" variant="outline" className="self-start" onClick={() => set('faq', [...site.faq, { pergunta: '', resposta: '' }])}>
                    <Plus /> Adicionar pergunta
                  </Btn>
                </div>
              )}
            </Card>
          )}

          {aba === 'midia' && (
            <div className="flex flex-col gap-4">
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Galeria de fotos</span>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary">
                    <ImagePlus className="size-4" aria-hidden /> Adicionar foto
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        e.target.value = ''
                        if (!f) return
                        const imagem_url = await processarImagem(f, { maxLado: 1000, aspecto: 1 })
                        upsert('sites_galeria', { id: uid(), empresa_id: site.empresa_id, imagem_url, legenda: '', ordem: galeria.length })
                      }}
                    />
                  </label>
                </div>
                {galeria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma foto ainda.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {galeria.map((g) => (
                      <div key={g.id} className="flex flex-col gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.imagem_url} alt={g.legenda || 'Foto da galeria'} className="aspect-square w-full rounded-lg object-cover" />
                        <div className="flex items-center gap-1">
                          <Input aria-label="Legenda" value={g.legenda} placeholder="Legenda" onChange={(e) => upsert('sites_galeria', { ...g, legenda: e.target.value })} className="h-8 text-xs" />
                          <Btn size="sm" variant="ghost" aria-label="Remover foto" onClick={() => remove('sites_galeria', g.id)}>
                            <Trash2 />
                          </Btn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Depoimentos</span>
                  <Btn size="sm" variant="outline" onClick={() => upsert('sites_depoimentos', { id: uid(), empresa_id: site.empresa_id, nome_cliente: 'Cliente', texto: 'Atendimento excelente!', nota: 5, foto_url: '', ordem: depoimentos.length })}>
                    <Plus /> Adicionar
                  </Btn>
                </div>
                {depoimentos.map((d) => (
                  <div key={d.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input aria-label="Nome do cliente" value={d.nome_cliente} onChange={(e) => upsert('sites_depoimentos', { ...d, nome_cliente: e.target.value })} />
                      <div className="flex" role="radiogroup" aria-label="Nota">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" role="radio" aria-checked={d.nota === n} aria-label={`${n} estrelas`} onClick={() => upsert('sites_depoimentos', { ...d, nota: n })}>
                            <Star className={cn('size-4', n <= d.nota ? 'fill-pos text-pos' : 'text-muted-foreground')} />
                          </button>
                        ))}
                      </div>
                      <Btn size="sm" variant="ghost" aria-label="Remover depoimento" onClick={() => remove('sites_depoimentos', d.id)}>
                        <Trash2 />
                      </Btn>
                    </div>
                    <Textarea aria-label="Depoimento" rows={2} value={d.texto} onChange={(e) => upsert('sites_depoimentos', { ...d, texto: e.target.value })} />
                  </div>
                ))}
              </Card>
            </div>
          )}

          {aba === 'seo' && (
            <Card className="flex flex-col gap-4 p-5">
              <Field label="Título no Google" hint={`${(site.meta_title || '').length}/60`}>
                <div className="flex gap-2">
                  <Input value={site.meta_title} maxLength={60} onChange={(e) => set('meta_title', e.target.value)} />
                  <Btn size="sm" variant="outline" onClick={() => set('meta_title', sugestaoMetaTitle(empresa?.nome ?? '', empresa?.segmento ?? '', site.endereco))}>
                    Sugerir
                  </Btn>
                </div>
              </Field>
              <Field label="Descrição no Google" hint={`${(site.meta_description || '').length}/158`}>
                <Textarea rows={3} value={site.meta_description} maxLength={158} onChange={(e) => set('meta_description', e.target.value)} />
              </Field>
              <Btn size="sm" variant="outline" className="self-start" onClick={() => set('meta_description', sugestaoMetaDescription(site, catalogo.map((c) => c.nome)))}>
                Sugerir descrição
              </Btn>
              <div className="flex flex-col gap-1 rounded-lg border border-border bg-background p-4">
                <span className="truncate text-xs text-muted-foreground">{url}</span>
                <span className="truncate text-base font-medium text-captacao">{site.meta_title || sugestaoMetaTitle(empresa?.nome ?? '', empresa?.segmento ?? '', site.endereco)}</span>
                <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{site.meta_description || sugestaoMetaDescription(site, catalogo.map((c) => c.nome))}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Upload label="Imagem de compartilhamento" valor={site.og_image_url} onFile={(f) => enviarImagem(f, 'og_image_url')} onLimpar={() => set('og_image_url', '')} />
                <Upload label="Favicon" valor={site.favicon_url} onFile={(f) => enviarImagem(f, 'favicon_url')} onLimpar={() => set('favicon_url', '')} />
              </div>
            </Card>
          )}

          {aba === 'analytics' && <Analytics empresaId={site.empresa_id} />}

          {aba === 'leads' && (
            <Card className="flex flex-col divide-y divide-border">
              {db.sites_formularios.filter((f) => f.empresa_id === site.empresa_id).length === 0 ? (
                <div className="p-5">
                  <Empty icon={<Inbox />} title="Nenhum pedido pelo site ainda" description="Quando alguém preencher o formulário, aparece aqui, no CRM e no Inbox." />
                </div>
              ) : (
                db.sites_formularios
                  .filter((f) => f.empresa_id === site.empresa_id)
                  .map((f) => {
                    const servico = db.catalogo.find((c) => c.id === f.servico_id)
                    const at = db.atendimentos.find((a) => a.empresa_id === f.empresa_id && a.cliente_telefone === f.telefone)
                    return (
                      <div key={f.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="font-medium">{f.nome}</span>
                          <span className="font-mono text-xs text-muted-foreground">{f.telefone}</span>
                          <span className="text-sm text-muted-foreground">
                            {[servico?.nome, f.data_desejada && `${f.data_desejada.split('-').reverse().join('/')}${f.horario ? ` ${f.horario}` : ''}`, f.mensagem].filter(Boolean).join(' · ') || 'Sem detalhes'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                          {at && (
                            <Btn size="sm" tone="ia" variant="soft" onClick={() => abrirNoInbox(at.id)}>
                              Abrir no Inbox
                            </Btn>
                          )}
                        </div>
                      </div>
                    )
                  })
              )}
            </Card>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-muted-foreground">Pré-visualização {sujo && '· alterações não salvas'}</span>
            <div className="flex rounded-lg border border-border p-0.5" role="group" aria-label="Dispositivo">
              {(['mobile', 'desktop'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={device === d}
                  aria-label={d === 'mobile' ? 'Celular' : 'Computador'}
                  onClick={() => setDevice(d)}
                  className={cn('flex size-8 items-center justify-center rounded-md', device === d ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
                >
                  {d === 'mobile' ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
                </button>
              ))}
            </div>
          </div>
          <div className={cn('mx-auto w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm', device === 'mobile' ? 'max-w-[390px]' : 'max-w-full')}>
            <div className="h-[640px] overflow-y-auto">
              <VitrineView data={preview} preview />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Upload({ label, valor, onFile, onLimpar }: { label: string; valor: string; onFile: (f: File | undefined) => void; onLimpar: () => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {valor ? <img src={valor} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5 text-muted-foreground" aria-hidden />}
        </div>
        <div className="flex flex-col gap-1">
          <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-border px-3 text-xs font-medium hover:bg-secondary">
            Enviar imagem
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={(e) => {
                onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {valor && (
            <button type="button" onClick={onLimpar} className="text-left text-xs text-muted-foreground hover:text-foreground">
              Remover
            </button>
          )}
        </div>
      </div>
    </Field>
  )
}

function Analytics({ empresaId }: { empresaId: string }) {
  const { db } = useData()
  const [dias, setDias] = useState<7 | 30>(30)
  const desde = Date.now() - dias * 86_400_000
  const eventos = db.sites_visitas.filter((v) => v.empresa_id === empresaId && new Date(v.created_at).getTime() >= desde)
  const usarDemo = eventos.length < 5
  const serie = useMemo(() => {
    if (usarDemo) return serieDemonstracao(dias)
    const mapa = new Map<string, { dia: string; visitas: number; whatsapp: number; agendar: number; formularios: number }>()
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const k = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
      mapa.set(k, { dia: k, visitas: 0, whatsapp: 0, agendar: 0, formularios: 0 })
    }
    for (const e of eventos) {
      const d = new Date(e.created_at)
      const linha = mapa.get(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`)
      if (!linha) continue
      if (e.acao === 'visita') linha.visitas++
      if (e.acao === 'clique_whatsapp') linha.whatsapp++
      if (e.acao === 'clique_agendar') linha.agendar++
      if (e.acao === 'formulario_enviado') linha.formularios++
    }
    return [...mapa.values()]
  }, [usarDemo, dias, eventos])

  const tot = serie.reduce((a, s) => ({ visitas: a.visitas + s.visitas, whatsapp: a.whatsapp + s.whatsapp, agendar: a.agendar + s.agendar, formularios: a.formularios + s.formularios }), { visitas: 0, whatsapp: 0, agendar: 0, formularios: 0 })
  const max = Math.max(1, ...serie.map((s) => s.visitas))
  const conversao = tot.visitas ? (((tot.whatsapp + tot.formularios) / tot.visitas) * 100).toFixed(1) : '0'
  const origens = Object.entries(
    eventos.filter((e) => e.acao === 'visita').reduce<Record<string, number>>((acc, e) => ((acc[e.origem] = (acc[e.origem] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs value={String(dias) as '7' | '30'} onChange={(v) => setDias(Number(v) as 7 | 30)} items={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />
        {usarDemo && <Badge tone="neutral">Dados de exemplo até ter volume real</Badge>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label={ACAO_LABEL.visita} value={tot.visitas} tone="captacao" />
        <Stat label={ACAO_LABEL.clique_whatsapp} value={tot.whatsapp} tone="vendas" />
        <Stat label={ACAO_LABEL.formulario_enviado} value={tot.formularios} tone="ia" />
        <Stat label="Conversão" value={`${conversao}%`} hint="WhatsApp + formulários / visitas" tone="pos" />
      </div>
      <Card className="flex flex-col gap-3 p-5">
        <span className="text-sm font-medium">Visitas por dia</span>
        <div className="flex h-36 items-end gap-0.5" role="img" aria-label={`Gráfico de visitas dos últimos ${dias} dias`}>
          {serie.map((s) => (
            <div key={s.dia} className="flex h-full flex-1 flex-col justify-end" title={`${s.dia}: ${s.visitas} visitas`}>
              <div className="w-full rounded-t-sm bg-captacao/70" style={{ height: `${(s.visitas / max) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>{serie[0]?.dia}</span>
          <span>{serie.at(-1)?.dia}</span>
        </div>
      </Card>
      {origens.length > 0 && (
        <Card className="flex flex-col gap-2 p-5">
          <span className="text-sm font-medium">Origem das visitas</span>
          {origens.map(([o, n]) => (
            <div key={o} className="flex items-center justify-between text-sm">
              <span className="capitalize">{o}</span>
              <span className="font-mono text-muted-foreground">{n}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
