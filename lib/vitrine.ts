import type { AcaoSite, CatalogoItem, SecaoSite, SiteDepoimento, SiteGaleria, SiteVitrine, TemplateSite } from './types'

export interface TemplateDef {
  key: TemplateSite
  nome: string
  descricao: string
  cor: string
  hero: 'split' | 'center' | 'full'
  servicos: 'cards' | 'grid' | 'lista' | 'tabela' | 'menu'
  raio: string
  claro: { bg: string; fg: string; card: string; muted: string; border: string }
  escuro: { bg: string; fg: string; card: string; muted: string; border: string }
}

const CLARO_PADRAO = { bg: '#fafafa', fg: '#18181b', card: '#ffffff', muted: '#71717a', border: '#e4e4e7' }
const ESCURO_PADRAO = { bg: '#0c0c0e', fg: '#fafafa', card: '#17171a', muted: '#a1a1aa', border: '#27272a' }

export const TEMPLATES: TemplateDef[] = [
  { key: 'minimalista', nome: 'Minimalista', descricao: 'Fundo claro, tipografia limpa, foco nos serviços.', cor: '#18181b', hero: 'center', servicos: 'lista', raio: '0.375rem', claro: CLARO_PADRAO, escuro: ESCURO_PADRAO },
  { key: 'vitrine', nome: 'Vitrine', descricao: 'Grade de produtos em destaque, ideal para loja.', cor: '#2563eb', hero: 'split', servicos: 'grid', raio: '1rem', claro: { ...CLARO_PADRAO, bg: '#f4f6fb' }, escuro: ESCURO_PADRAO },
  { key: 'clinica', nome: 'Clínica', descricao: 'Tom sóbrio, especialidades e credenciais.', cor: '#0f766e', hero: 'split', servicos: 'cards', raio: '0.5rem', claro: { bg: '#f6f9f9', fg: '#0f1f1f', card: '#ffffff', muted: '#5b6b6b', border: '#dce6e6' }, escuro: { bg: '#071212', fg: '#eef6f6', card: '#0e1d1d', muted: '#93a8a8', border: '#1c3232' } },
  { key: 'estetica', nome: 'Salão / Estética', descricao: 'Visual moderno, galeria e preço por serviço.', cor: '#be5a76', hero: 'full', servicos: 'cards', raio: '1.25rem', claro: { bg: '#fbf8f7', fg: '#2a1d21', card: '#ffffff', muted: '#7d6a6f', border: '#eee3e5' }, escuro: { bg: '#130c0e', fg: '#fbf1f3', card: '#1f1418', muted: '#b7a2a8', border: '#33242a' } },
  { key: 'oficina', nome: 'Oficina', descricao: 'Blocos técnicos, tabela de serviços, agendamento destacado.', cor: '#ea580c', hero: 'split', servicos: 'tabela', raio: '0.25rem', claro: { bg: '#f5f5f4', fg: '#1c1917', card: '#ffffff', muted: '#78716c', border: '#d6d3d1' }, escuro: { bg: '#0f0e0d', fg: '#f5f5f4', card: '#1c1a18', muted: '#a8a29e', border: '#2e2b28' } },
  { key: 'restaurante', nome: 'Restaurante', descricao: 'Menu em destaque, foto grande, botão de reserva.', cor: '#b45309', hero: 'full', servicos: 'menu', raio: '0.75rem', claro: { bg: '#fbf7f0', fg: '#2b2015', card: '#fffdf8', muted: '#7c6a55', border: '#eadfcd' }, escuro: { bg: '#120d08', fg: '#f8efe3', card: '#1d160f', muted: '#b8a48b', border: '#33281c' } },
]

export const templateDef = (k: TemplateSite) => TEMPLATES.find((t) => t.key === k) ?? TEMPLATES[0]

export const PALETAS = ['#be5a76', '#0f766e', '#2563eb', '#ea580c', '#16a34a', '#b45309', '#7c3aed', '#18181b']

export const SECOES: { key: SecaoSite; label: string }[] = [
  { key: 'sobre', label: 'Sobre' },
  { key: 'servicos', label: 'Serviços / Produtos' },
  { key: 'galeria', label: 'Galeria de fotos' },
  { key: 'depoimentos', label: 'Depoimentos' },
  { key: 'contato', label: 'Formulário de contato' },
  { key: 'mapa', label: 'Mapa' },
  { key: 'faq', label: 'Perguntas frequentes' },
]

export const SECOES_PADRAO: Record<SecaoSite, boolean> = { sobre: true, servicos: true, galeria: true, depoimentos: true, contato: true, mapa: true, faq: false }

export const ACAO_LABEL: Record<AcaoSite, string> = {
  visita: 'Visitas',
  clique_whatsapp: 'Cliques no WhatsApp',
  clique_agendar: 'Cliques em Agendar',
  formulario_enviado: 'Formulários enviados',
}

export function slugify(texto: string) {
  return (
    texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'meu-negocio'
  )
}

export const SLUG_RESERVADOS = new Set(['admin', 'api', 'painel', 'login', 'cadastro', 'app', 'www', 'atendeai'])

/** Retorna o slug livre: o próprio, ou com sufixo -2, -3... */
export function sugerirSlug(base: string, emUso: (s: string) => boolean) {
  const limpo = slugify(base)
  if (!emUso(limpo) && !SLUG_RESERVADOS.has(limpo)) return limpo
  for (let i = 2; i < 100; i++) {
    const c = `${limpo}-${i}`
    if (!emUso(c)) return c
  }
  return `${limpo}-${Date.now().toString(36)}`
}

export const soDigitos = (s: string) => s.replace(/\D/g, '')

export function linkWhatsapp(numero: string, mensagem: string) {
  let n = soDigitos(numero)
  if (n && n.length <= 11) n = `55${n}`
  return `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}`
}

export const mensagemProduto = (nome: string) => `Olá! Vi no site que vocês têm ${nome}. Quero saber mais.`
export const mensagemGeral = (empresa: string) => `Olá, ${empresa}! Vi o site de vocês e quero saber mais.`

export const mapaEmbed = (endereco: string) => `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed`

/** Dados mínimos e públicos que a vitrine renderiza (nunca expõe PIX, CNPJ, etc.). */
export interface VitrinePublica {
  empresa_id: string
  nome: string
  segmento: string
  site: SiteVitrine
  catalogo: Pick<CatalogoItem, 'id' | 'nome' | 'tipo' | 'preco' | 'duracao_minutos' | 'descricao'>[]
  galeria: SiteGaleria[]
  depoimentos: SiteDepoimento[]
}

export function novoSite(p: { empresa_id: string; nome: string; segmento: string; slug: string; template: TemplateSite; id: string; agora: string }): SiteVitrine {
  const tpl = templateDef(p.template)
  return {
    id: p.id,
    empresa_id: p.empresa_id,
    slug: p.slug,
    publicado: false,
    template: p.template,
    cor_destaque: tpl.cor,
    modo_escuro: false,
    logo_url: '',
    banner_url: '',
    og_image_url: '',
    favicon_url: '',
    headline: p.nome,
    subtitulo: `${p.segmento} com atendimento rápido pelo WhatsApp.`,
    sobre: '',
    endereco: '',
    telefone: '',
    whatsapp: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    horario_funcionamento: 'Segunda a sexta, 9h às 18h',
    meta_title: '',
    meta_description: '',
    secoes_ativas: { ...SECOES_PADRAO },
    faq: [],
    created_at: p.agora,
    updated_at: p.agora,
  }
}

export const sugestaoMetaTitle = (nome: string, segmento: string, endereco: string) => {
  const cidade = endereco.split(/[-,]/).map((s) => s.trim()).filter(Boolean).slice(-2, -1)[0]
  return `${nome} · ${segmento}${cidade ? ` em ${cidade}` : ''}`.slice(0, 60)
}

export const sugestaoMetaDescription = (site: SiteVitrine, servicos: string[]) =>
  `${site.subtitulo || site.headline} ${servicos.length ? `Serviços: ${servicos.slice(0, 3).join(', ')}.` : ''} Fale conosco pelo WhatsApp.`.replace(/\s+/g, ' ').trim().slice(0, 158)

/** Série fictícia e determinística para quando ainda não há volume real. */
export function serieDemonstracao(dias: number) {
  const out: { dia: string; visitas: number; whatsapp: number; agendar: number; formularios: number }[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const seed = (d.getDate() * 37 + d.getMonth() * 11) % 17
    const fimDeSemana = d.getDay() === 0 || d.getDay() === 6
    const visitas = 38 + seed * 3 + (fimDeSemana ? 18 : 0)
    out.push({
      dia: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      visitas,
      whatsapp: Math.round(visitas * 0.14),
      agendar: Math.round(visitas * 0.06),
      formularios: Math.round(visitas * 0.035),
    })
  }
  return out
}

/** Comprime uma imagem no navegador e devolve data URL (com recorte opcional). */
export async function processarImagem(
  file: File,
  opts: { maxLado: number; aspecto?: number; offsetY?: number; zoom?: number; formato?: 'image/jpeg' | 'image/png' } = { maxLado: 1200 },
): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((ok, err) => {
      img.onload = () => ok()
      img.onerror = () => err(new Error('Imagem inválida'))
      img.src = url
    })
    let sw = img.naturalWidth
    let sh = img.naturalHeight
    let sx = 0
    let sy = 0
    if (opts.aspecto) {
      const zoom = Math.max(1, opts.zoom ?? 1)
      if (sw / sh > opts.aspecto) {
        sw = sh * opts.aspecto
      } else {
        sh = sw / opts.aspecto
      }
      sw /= zoom
      sh /= zoom
      sx = (img.naturalWidth - sw) / 2
      sy = (img.naturalHeight - sh) * (opts.offsetY ?? 0.5)
    }
    const escala = Math.min(1, opts.maxLado / Math.max(sw, sh))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(sw * escala)
    canvas.height = Math.round(sh * escala)
    canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL(opts.formato ?? 'image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}
