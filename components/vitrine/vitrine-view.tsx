'use client'

import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { CalendarDays, Check, Clock, Loader2, MapPin, MessageCircle, Phone, Star, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { linkWhatsapp, mapaEmbed, mensagemGeral, mensagemProduto, soDigitos, templateDef, type VitrinePublica } from '@/lib/vitrine'
import type { AcaoSite } from '@/lib/types'

export interface FormularioSiteInput {
  nome: string
  telefone: string
  mensagem: string
  servico_id: string | null
  data_desejada: string | null
  horario: string
}

interface Props {
  data: VitrinePublica
  preview?: boolean
  onEvento?: (acao: AcaoSite) => void
  onFormulario?: (f: FormularioSiteInput) => Promise<{ ok: boolean; error?: string }>
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function corSobre(hex: string) {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#111111' : '#ffffff'
}

export function VitrineView({ data, preview = false, onEvento, onFormulario }: Props) {
  const { site, nome, catalogo, galeria, depoimentos } = data
  const tpl = templateDef(site.template)
  const pal = site.modo_escuro ? tpl.escuro : tpl.claro
  const sec = site.secoes_ativas
  const [agendarAberto, setAgendarAberto] = useState(false)

  const vars = {
    '--v-bg': pal.bg,
    '--v-fg': pal.fg,
    '--v-card': pal.card,
    '--v-muted': pal.muted,
    '--v-border': pal.border,
    '--v-accent': site.cor_destaque,
    '--v-on-accent': corSobre(site.cor_destaque),
    '--v-radius': tpl.raio,
    '--v-overlay': 'rgba(0,0,0,0.52)',
    '--v-on-overlay': '#ffffff',
  } as CSSProperties

  const temWhats = soDigitos(site.whatsapp).length >= 10
  const waGeral = linkWhatsapp(site.whatsapp, mensagemGeral(nome))
  const clicarWhats = () => onEvento?.('clique_whatsapp')
  const clicarAgendar = () => {
    onEvento?.('clique_agendar')
    if (preview) document.getElementById('v-contato')?.scrollIntoView({ behavior: 'smooth' })
    else setAgendarAberto(true)
  }

  const nav = [
    sec.sobre && site.sobre && { href: '#v-sobre', label: 'Sobre' },
    sec.servicos && catalogo.length > 0 && { href: '#v-servicos', label: tpl.servicos === 'menu' ? 'Cardápio' : 'Serviços' },
    sec.galeria && galeria.length > 0 && { href: '#v-galeria', label: 'Galeria' },
    sec.contato && { href: '#v-contato', label: 'Contato' },
  ].filter(Boolean) as { href: string; label: string }[]

  return (
    <div style={vars} className="@container min-h-full bg-[var(--v-bg)] font-sans text-[var(--v-fg)] antialiased">
      <header className="sticky top-0 z-20 border-b border-[var(--v-border)] bg-[var(--v-bg)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <a href="#v-topo" className="flex min-w-0 items-center gap-2.5">
            {site.logo_url ? (
              <img src={site.logo_url || '/placeholder.svg'} alt={`Logo ${nome}`} className="h-9 w-auto max-w-32 object-contain" />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--v-radius)] bg-[var(--v-accent)] text-sm font-bold text-[var(--v-on-accent)]">{nome.slice(0, 1)}</span>
            )}
            <span className="truncate font-semibold tracking-tight">{nome}</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-[var(--v-muted)] @3xl:flex" aria-label="Seções do site">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="transition-colors hover:text-[var(--v-fg)]">
                {n.label}
              </a>
            ))}
          </nav>
          {temWhats && (
            <a href={waGeral} target="_blank" rel="noopener noreferrer" onClick={clicarWhats} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[var(--v-radius)] bg-[var(--v-accent)] px-4 text-sm font-medium text-[var(--v-on-accent)] transition-opacity hover:opacity-90">
              <MessageCircle className="size-4" />
              <span className="hidden @md:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      <main id="v-topo">
        <Hero data={data} hero={tpl.hero} waGeral={waGeral} temWhats={temWhats} onWhats={clicarWhats} onAgendar={clicarAgendar} reserva={site.template === 'restaurante'} />

        {sec.sobre && site.sobre && (
          <Secao id="v-sobre" eyebrow="Sobre nós" titulo={`Conheça ${nome}`}>
            <p className="max-w-3xl text-pretty text-lg leading-relaxed text-[var(--v-muted)]">{site.sobre}</p>
          </Secao>
        )}

        {sec.servicos && catalogo.length > 0 && (
          <Secao id="v-servicos" eyebrow={tpl.servicos === 'menu' ? 'Cardápio' : 'O que oferecemos'} titulo={tpl.servicos === 'menu' ? 'Nosso menu' : tpl.servicos === 'grid' ? 'Produtos em destaque' : 'Serviços e preços'} alt>
            <Servicos data={data} estilo={tpl.servicos} onWhats={clicarWhats} temWhats={temWhats} />
          </Secao>
        )}

        {sec.galeria && galeria.length > 0 && (
          <Secao id="v-galeria" eyebrow="Galeria" titulo="Por dentro do nosso espaço">
            <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
              {galeria.map((g, i) => (
                <figure key={g.id} className={cn('group relative overflow-hidden rounded-[var(--v-radius)] bg-[var(--v-card)]', i === 0 && galeria.length > 2 && 'col-span-2 row-span-2 @3xl:col-span-2')}>
                  <img src={g.imagem_url || '/placeholder.svg'} alt={g.legenda || `Foto ${i + 1} de ${nome}`} className="aspect-square size-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  {g.legenda && <figcaption className="absolute inset-x-0 bottom-0 bg-[var(--v-overlay)] px-3 py-2 text-xs text-[var(--v-on-overlay)]">{g.legenda}</figcaption>}
                </figure>
              ))}
            </div>
          </Secao>
        )}

        {sec.depoimentos && depoimentos.length > 0 && (
          <Secao id="v-depoimentos" eyebrow="Depoimentos" titulo="Quem já veio, recomenda" alt>
            <div className="grid gap-4 @3xl:grid-cols-3">
              {depoimentos.map((d) => (
                <figure key={d.id} className="flex flex-col gap-4 rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-card)] p-6">
                  <div className="flex gap-0.5 text-[var(--v-accent)]" aria-label={`Nota ${d.nota} de 5`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('size-4', i < d.nota ? 'fill-current' : 'opacity-30')} aria-hidden />
                    ))}
                  </div>
                  <blockquote className="flex-1 text-pretty leading-relaxed">&ldquo;{d.texto}&rdquo;</blockquote>
                  <figcaption className="flex items-center gap-3 text-sm text-[var(--v-muted)]">
                    {d.foto_url ? (
                      <img src={d.foto_url || '/placeholder.svg'} alt="" className="size-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-full bg-[var(--v-border)] text-xs font-semibold text-[var(--v-fg)]">{d.nome_cliente.slice(0, 1)}</span>
                    )}
                    {d.nome_cliente}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Secao>
        )}

        {sec.faq && site.faq.length > 0 && (
          <Secao id="v-faq" eyebrow="Dúvidas" titulo="Perguntas frequentes">
            <div className="flex max-w-3xl flex-col divide-y divide-[var(--v-border)] border-y border-[var(--v-border)]">
              {site.faq.map((f, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {f.pergunta}
                    <span className="text-xl leading-none text-[var(--v-accent)] transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="pt-3 leading-relaxed text-[var(--v-muted)]">{f.resposta}</p>
                </details>
              ))}
            </div>
          </Secao>
        )}

        {(sec.contato || sec.mapa) && (
          <Secao id="v-contato" eyebrow="Contato" titulo={site.template === 'restaurante' ? 'Faça sua reserva' : 'Fale com a gente'} alt>
            <div className="grid gap-8 @3xl:grid-cols-2">
              {sec.contato && <FormularioSite data={data} preview={preview} onFormulario={onFormulario} comAgenda />}
              <div className="flex flex-col gap-5">
                <ul className="flex flex-col gap-3 text-sm">
                  {site.endereco && <InfoLinha icon={<MapPin />}>{site.endereco}</InfoLinha>}
                  {site.horario_funcionamento && <InfoLinha icon={<Clock />}>{site.horario_funcionamento}</InfoLinha>}
                  {site.telefone && (
                    <InfoLinha icon={<Phone />}>
                      <a href={`tel:${soDigitos(site.telefone)}`} className="hover:underline">
                        {site.telefone}
                      </a>
                    </InfoLinha>
                  )}
                </ul>
                {sec.mapa && site.endereco && (
                  <iframe
                    title={`Mapa: ${site.endereco}`}
                    src={mapaEmbed(site.endereco)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="aspect-[4/3] w-full rounded-[var(--v-radius)] border border-[var(--v-border)]"
                  />
                )}
              </div>
            </div>
          </Secao>
        )}
      </main>

      <footer className="border-t border-[var(--v-border)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-[var(--v-muted)] @3xl:flex-row @3xl:items-center @3xl:justify-between">
          <p>
            © {new Date().getFullYear()} {nome}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {site.instagram && <Social href={`https://instagram.com/${site.instagram.replace('@', '')}`} label="Instagram" />}
            {site.facebook && <Social href={`https://facebook.com/${site.facebook}`} label="Facebook" />}
            {site.tiktok && <Social href={`https://tiktok.com/@${site.tiktok.replace('@', '')}`} label="TikTok" />}
          </div>
          <a href="/" className="font-mono text-xs hover:text-[var(--v-fg)]">
            Site feito com Atende Aí 360
          </a>
        </div>
      </footer>

      {agendarAberto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--v-overlay)] p-0 @md:items-center @md:p-4" onClick={() => setAgendarAberto(false)}>
          <div role="dialog" aria-modal="true" aria-label="Agendar horário" onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[var(--v-radius)] bg-[var(--v-card)] p-6 @md:rounded-[var(--v-radius)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{site.template === 'restaurante' ? 'Reservar mesa' : 'Agendar horário'}</h2>
                <p className="text-sm text-[var(--v-muted)]">Confirmamos pelo WhatsApp em instantes.</p>
              </div>
              <button type="button" onClick={() => setAgendarAberto(false)} aria-label="Fechar" className="rounded-md p-1 text-[var(--v-muted)] hover:text-[var(--v-fg)]">
                <X className="size-5" />
              </button>
            </div>
            <FormularioSite data={data} onFormulario={onFormulario} comAgenda semCartao onDone={() => setTimeout(() => setAgendarAberto(false), 2200)} />
          </div>
        </div>
      )}
    </div>
  )
}

function Hero({
  data,
  hero,
  waGeral,
  temWhats,
  onWhats,
  onAgendar,
  reserva,
}: {
  data: VitrinePublica
  hero: 'split' | 'center' | 'full'
  waGeral: string
  temWhats: boolean
  onWhats: () => void
  onAgendar: () => void
  reserva: boolean
}) {
  const { site } = data
  const botoes = (
    <div className="flex flex-wrap gap-3">
      {temWhats && (
        <a href={waGeral} target="_blank" rel="noopener noreferrer" onClick={onWhats} className="inline-flex h-12 items-center gap-2 rounded-[var(--v-radius)] bg-[var(--v-accent)] px-6 font-medium text-[var(--v-on-accent)] transition-opacity hover:opacity-90">
          <MessageCircle className="size-5" /> Falar no WhatsApp
        </a>
      )}
      {site.secoes_ativas.contato && (
        <button
          type="button"
          onClick={onAgendar}
          className={cn(
            'inline-flex h-12 items-center gap-2 rounded-[var(--v-radius)] border px-6 font-medium transition-colors',
            hero === 'full' && site.banner_url ? 'border-[var(--v-on-overlay)] text-[var(--v-on-overlay)] hover:bg-[var(--v-on-overlay)]/10' : 'border-[var(--v-border)] hover:bg-[var(--v-card)]',
          )}
        >
          <CalendarDays className="size-5" /> {reserva ? 'Reservar' : 'Agendar'}
        </button>
      )}
    </div>
  )

  if (hero === 'full' && site.banner_url)
    return (
      <section className="relative isolate flex min-h-[78vh] items-end overflow-hidden">
        <img src={site.banner_url || '/placeholder.svg'} alt="" className="absolute inset-0 -z-20 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--v-overlay)] via-[var(--v-overlay)]/40 to-transparent" />
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 pb-14 pt-32 text-[var(--v-on-overlay)]">
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight @3xl:text-6xl">{site.headline}</h1>
          {site.subtitulo && <p className="max-w-xl text-pretty text-lg leading-relaxed opacity-90">{site.subtitulo}</p>}
          {botoes}
        </div>
      </section>
    )

  if (hero === 'split')
    return (
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 @3xl:grid-cols-2 @3xl:py-20">
        <div className="flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--v-accent)]">{data.segmento}</span>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight @3xl:text-5xl">{site.headline}</h1>
          {site.subtitulo && <p className="max-w-lg text-pretty text-lg leading-relaxed text-[var(--v-muted)]">{site.subtitulo}</p>}
          {botoes}
        </div>
        {site.banner_url && <img src={site.banner_url || '/placeholder.svg'} alt={`Ambiente de ${data.nome}`} className="aspect-[4/3] w-full rounded-[var(--v-radius)] object-cover" />}
      </section>
    )

  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-16 text-center @3xl:py-24">
      <span className="font-mono text-xs uppercase tracking-widest text-[var(--v-muted)]">{data.segmento}</span>
      <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight @3xl:text-6xl">{site.headline}</h1>
      {site.subtitulo && <p className="max-w-xl text-pretty text-lg leading-relaxed text-[var(--v-muted)]">{site.subtitulo}</p>}
      {botoes}
      {site.banner_url && <img src={site.banner_url || '/placeholder.svg'} alt={`Ambiente de ${data.nome}`} className="mt-6 aspect-[21/9] w-full rounded-[var(--v-radius)] object-cover" />}
    </section>
  )
}

function Servicos({ data, estilo, onWhats, temWhats }: { data: VitrinePublica; estilo: 'cards' | 'grid' | 'lista' | 'tabela' | 'menu'; onWhats: () => void; temWhats: boolean }) {
  const link = (n: string) => linkWhatsapp(data.site.whatsapp, mensagemProduto(n))
  const Pedir = ({ nome, compacto }: { nome: string; compacto?: boolean }) =>
    temWhats ? (
      <a
        href={link(nome)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onWhats}
        aria-label={`Pedir ${nome} pelo WhatsApp`}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[var(--v-radius)] font-medium transition-opacity hover:opacity-90',
          compacto ? 'h-9 px-3 text-sm text-[var(--v-accent)] hover:bg-[var(--v-accent)]/10' : 'h-10 bg-[var(--v-accent)] px-4 text-sm text-[var(--v-on-accent)]',
        )}
      >
        <MessageCircle className="size-4" /> {compacto ? 'Pedir' : 'Pedir pelo WhatsApp'}
      </a>
    ) : null
  const dur = (m: number) => (m ? (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ''}` : `${m} min`) : '')

  if (estilo === 'tabela')
    return (
      <div className="overflow-x-auto rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--v-border)] font-mono text-xs uppercase tracking-wider text-[var(--v-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="hidden px-4 py-3 font-medium @md:table-cell">Tempo</th>
              <th className="px-4 py-3 text-right font-medium">Preço</th>
              <th className="px-4 py-3">
                <span className="sr-only">Ação</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--v-border)]">
            {data.catalogo.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{c.nome}</p>
                  {c.descricao && <p className="text-xs text-[var(--v-muted)]">{c.descricao}</p>}
                </td>
                <td className="hidden px-4 py-3 text-[var(--v-muted)] @md:table-cell">{dur(c.duracao_minutos) || '—'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-semibold">{brl(c.preco)}</td>
                <td className="px-2 py-3 text-right">
                  <Pedir nome={c.nome} compacto />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )

  if (estilo === 'lista' || estilo === 'menu')
    return (
      <ul className={cn('grid gap-x-12', estilo === 'menu' && '@3xl:grid-cols-2')}>
        {data.catalogo.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 border-b border-[var(--v-border)] py-5">
            <div className="flex items-baseline gap-3">
              <h3 className="font-medium">{c.nome}</h3>
              <span className="flex-1 border-b border-dotted border-[var(--v-border)]" aria-hidden />
              <span className="whitespace-nowrap font-mono font-semibold">{brl(c.preco)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm leading-relaxed text-[var(--v-muted)]">
                {c.descricao}
                {c.duracao_minutos > 0 && estilo === 'lista' && ` · ${dur(c.duracao_minutos)}`}
              </p>
              <Pedir nome={c.nome} compacto />
            </div>
          </li>
        ))}
      </ul>
    )

  return (
    <div className={cn('grid gap-4 @md:grid-cols-2', estilo === 'grid' ? '@3xl:grid-cols-4' : '@3xl:grid-cols-3')}>
      {data.catalogo.map((c) => (
        <article key={c.id} className="flex flex-col gap-4 rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-card)] p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--v-muted)]">{c.tipo === 'produto' ? 'Produto' : dur(c.duracao_minutos) || 'Serviço'}</span>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <h3 className="text-lg font-semibold leading-snug">{c.nome}</h3>
            {c.descricao && <p className="text-sm leading-relaxed text-[var(--v-muted)]">{c.descricao}</p>}
          </div>
          <p className="font-mono text-2xl font-semibold tracking-tight">{brl(c.preco)}</p>
          <Pedir nome={c.nome} />
        </article>
      ))}
    </div>
  )
}

function FormularioSite({
  data,
  preview,
  onFormulario,
  comAgenda,
  semCartao,
  onDone,
}: {
  data: VitrinePublica
  preview?: boolean
  onFormulario?: Props['onFormulario']
  comAgenda?: boolean
  semCartao?: boolean
  onDone?: () => void
}) {
  const [f, setF] = useState<FormularioSiteInput>({ nome: '', telefone: '', mensagem: '', servico_id: null, data_desejada: null, horario: '' })
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [erro, setErro] = useState('')
  const hoje = new Date().toISOString().slice(0, 10)
  const campo = 'h-11 w-full rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-bg)] px-3 text-sm text-[var(--v-fg)] outline-none placeholder:text-[var(--v-muted)] focus:border-[var(--v-accent)]'

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (preview || !onFormulario) return
    if (f.nome.trim().length < 2) return (setErro('Informe seu nome.'), setEstado('erro'))
    const tel = soDigitos(f.telefone)
    if (tel.length < 10 || tel.length > 13) return (setErro('Informe um WhatsApp válido com DDD.'), setEstado('erro'))
    setEstado('enviando')
    const r = await onFormulario({ ...f, nome: f.nome.trim(), telefone: tel, mensagem: f.mensagem.trim().slice(0, 1000) })
    if (r.ok) {
      setEstado('ok')
      onDone?.()
    } else {
      setErro(r.error || 'Não foi possível enviar. Tente novamente.')
      setEstado('erro')
    }
  }

  if (estado === 'ok')
    return (
      <div className={cn('flex flex-col items-center gap-3 p-8 text-center', !semCartao && 'rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-card)]')}>
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--v-accent)] text-[var(--v-on-accent)]">
          <Check className="size-6" />
        </span>
        <p className="text-lg font-semibold">Recebemos seu pedido!</p>
        <p className="text-sm text-[var(--v-muted)]">Vamos te chamar no WhatsApp em instantes.</p>
      </div>
    )

  return (
    <form onSubmit={enviar} className={cn('flex flex-col gap-3', !semCartao && 'rounded-[var(--v-radius)] border border-[var(--v-border)] bg-[var(--v-card)] p-5')} noValidate>
      <div className="grid gap-3 @md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          Nome
          <input className={campo} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} autoComplete="name" maxLength={80} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          WhatsApp
          <input className={campo} value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} inputMode="tel" autoComplete="tel" placeholder="(11) 98888-7777" maxLength={20} required />
        </label>
      </div>
      {data.catalogo.length > 0 && (
        <label className="flex flex-col gap-1.5 text-sm">
          Serviço de interesse
          <select className={campo} value={f.servico_id ?? ''} onChange={(e) => setF({ ...f, servico_id: e.target.value || null })}>
            <option value="">Selecione (opcional)</option>
            {data.catalogo.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} · {brl(c.preco)}
              </option>
            ))}
          </select>
        </label>
      )}
      {comAgenda && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Data desejada
            <input type="date" min={hoje} className={campo} value={f.data_desejada ?? ''} onChange={(e) => setF({ ...f, data_desejada: e.target.value || null })} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Horário
            <input type="time" className={campo} value={f.horario} onChange={(e) => setF({ ...f, horario: e.target.value })} />
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-sm">
        Mensagem
        <textarea className={cn(campo, 'h-24 resize-none py-2.5')} value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} maxLength={1000} placeholder="Conte o que você precisa" />
      </label>
      {estado === 'erro' && (
        <p role="alert" className="text-sm font-medium text-[var(--v-accent)]">
          {erro}
        </p>
      )}
      <button type="submit" disabled={estado === 'enviando'} className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--v-radius)] bg-[var(--v-accent)] px-6 font-medium text-[var(--v-on-accent)] transition-opacity hover:opacity-90 disabled:opacity-60">
        {estado === 'enviando' && <Loader2 className="size-4 animate-spin" />}
        {preview ? 'Enviar (desativado na prévia)' : 'Enviar pedido'}
      </button>
      <p className="text-xs text-[var(--v-muted)]">Ao enviar, você concorda em ser contatado pelo WhatsApp.</p>
    </form>
  )
}

function Secao({ id, eyebrow, titulo, alt, children }: { id: string; eyebrow: string; titulo: string; alt?: boolean; children: ReactNode }) {
  return (
    <section id={id} className={cn('scroll-mt-16', alt && 'bg-[var(--v-card)]/60')}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-16 @3xl:py-20">
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-[var(--v-accent)]">{eyebrow}</span>
          <h2 className="text-balance text-3xl font-semibold tracking-tight @3xl:text-4xl">{titulo}</h2>
        </div>
        {children}
      </div>
    </section>
  )
}

function InfoLinha({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 text-[var(--v-accent)] [&_svg]:size-4">{icon}</span>
      <span className="leading-relaxed">{children}</span>
    </li>
  )
}

function Social({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-[var(--v-fg)]">
      {label}
    </a>
  )
}
