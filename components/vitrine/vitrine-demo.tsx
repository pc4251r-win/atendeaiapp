'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { VitrineView, type FormularioSiteInput } from './vitrine-view'
import { origemVisita } from './vitrine-real'
import { DEMO_STORAGE_KEY } from '@/components/atendeai/provider'
import type { VitrinePublica } from '@/lib/vitrine'
import type { AcaoSite, Atendimento, ClienteCRM, DB } from '@/lib/types'

type Payload = { db: DB; empresaId: string }

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

function lerPayload(): Payload | null {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    const p = raw ? (JSON.parse(raw) as Payload) : null
    return p?.db?.sites_vitrine ? p : null
  } catch {
    return null
  }
}

function montar(db: DB, slug: string): VitrinePublica | null {
  const site = db.sites_vitrine.find((s) => s.slug === slug)
  const emp = site && db.empresas.find((e) => e.id === site.empresa_id)
  if (!site || !emp) return null
  return {
    empresa_id: emp.id,
    nome: emp.nome,
    segmento: emp.segmento,
    site,
    catalogo: db.catalogo
      .filter((c) => c.empresa_id === emp.id && c.ativo)
      .map(({ id, nome, tipo, preco, duracao_minutos, descricao }) => ({ id, nome, tipo, preco, duracao_minutos, descricao })),
    galeria: db.sites_galeria.filter((g) => g.empresa_id === emp.id).sort((a, b) => a.ordem - b.ordem),
    depoimentos: db.sites_depoimentos.filter((d) => d.empresa_id === emp.id).sort((a, b) => a.ordem - b.ordem),
  }
}

/** Grava no estado do Modo Demonstração; o painel aberto em outra aba recebe pelo evento "storage". */
function gravar(mutar: (db: DB) => void) {
  const p = lerPayload()
  if (!p) return
  mutar(p.db)
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(p))
}

export function VitrineDemo({ slug }: { slug: string }) {
  const [estado, setEstado] = useState<{ pronto: boolean; data: VitrinePublica | null }>({ pronto: false, data: null })
  const registrou = useRef(false)

  useEffect(() => {
    const p = lerPayload()
    const data = p ? montar(p.db, slug) : null
    setEstado({ pronto: true, data })
    if (data && !registrou.current) {
      registrou.current = true
      const chave = `vitrine:visita:${slug}`
      if (!sessionStorage.getItem(chave)) {
        sessionStorage.setItem(chave, '1')
        gravar((db) => db.sites_visitas.push({ id: uid(), empresa_id: data.empresa_id, acao: 'visita', origem: origemVisita(), created_at: new Date().toISOString() }))
      }
    }
  }, [slug])

  if (!estado.pronto) return <main className="min-h-dvh bg-background" aria-busy="true" />

  if (!estado.data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="text-balance text-2xl font-semibold">Site não encontrado</h1>
        <p className="max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">
          Este endereço não existe ou o site ainda não foi publicado.
        </p>
        <Link href="/" className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
          Conhecer o Atende Aí 360
        </Link>
      </main>
    )
  }

  const data = estado.data
  const empresa_id = data.empresa_id

  const evento = (acao: AcaoSite) =>
    gravar((db) => db.sites_visitas.push({ id: uid(), empresa_id, acao, origem: origemVisita(), created_at: new Date().toISOString() }))

  const formulario = async (f: FormularioSiteInput) => {
    const telefone = f.telefone.replace(/\D/g, '')
    if (f.nome.trim().length < 2 || telefone.length < 10) return { ok: false, error: 'Informe nome e WhatsApp válidos.' }
    gravar((db) => {
      const agora = new Date().toISOString()
      const servico = db.catalogo.find((c) => c.id === f.servico_id)
      db.sites_formularios.push({
        id: uid(), empresa_id, nome: f.nome.trim(), telefone, mensagem: f.mensagem ?? '', servico_id: servico?.id ?? null,
        data_desejada: f.data_desejada || null, horario: f.horario ?? '', status: 'novo', created_at: agora,
      })
      db.sites_visitas.push({ id: uid(), empresa_id, acao: 'formulario_enviado', origem: 'site', created_at: agora })

      if (!db.clientes_crm.some((c) => c.empresa_id === empresa_id && c.telefone === telefone)) {
        const cliente = {
          id: uid(), empresa_id, nome: f.nome.trim(), telefone, email: '', aniversario: null, preferencias: '', tags: ['site'],
          ltv: 0, score_lead: 40, ultima_compra: null, ultima_interacao: agora,
          proxima_acao: servico ? `Retornar sobre ${servico.nome}` : 'Retornar contato do site', opt_in: true, opt_out: false, created_at: agora,
        } as ClienteCRM
        db.clientes_crm.push(cliente)
      }

      const texto = [
        `Olá! Vim pelo site.${servico ? ` Tenho interesse em ${servico.nome}.` : ''}`,
        f.data_desejada ? `Gostaria de agendar para ${f.data_desejada.split('-').reverse().join('/')}${f.horario ? ` às ${f.horario}` : ''}.` : '',
        f.mensagem ?? '',
      ].filter(Boolean).join(' ')

      const idx = db.atendimentos.findIndex((a) => a.empresa_id === empresa_id && a.cliente_telefone === telefone && a.status !== 'finalizado')
      let atId: string
      if (idx >= 0) {
        db.atendimentos[idx] = { ...db.atendimentos[idx], ultima_mensagem: texto, updated_at: agora }
        atId = db.atendimentos[idx].id
      } else {
        const at: Atendimento = {
          id: uid(), empresa_id, cliente_nome: f.nome.trim(), cliente_telefone: telefone, origem_campanha: 'site',
          etapa_funil: 'captado', status: 'ia', valor_estimado: servico?.preco ?? 0, ultima_mensagem: texto, updated_at: agora,
        }
        db.atendimentos.push(at)
        atId = at.id
      }
      db.mensagens.push({ id: uid(), atendimento_id: atId, remetente: 'cliente', texto, created_at: agora })
    })
    return { ok: true }
  }

  return <VitrineView data={data} onEvento={evento} onFormulario={formulario} />
}
