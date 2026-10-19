'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, CheckCheck, MoreVertical, Paperclip, Search, Send, Sparkles, User, Users } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn } from '@/components/atendeai/ui'
import { brl, diasDesde, isoDate } from '@/lib/format'
import type { Atendimento, ClienteCRM, Mensagem } from '@/lib/types'
import { cn } from '@/lib/utils'

/* =========================================================
   INBOX COM VISUAL DE WHATSAPP
   ========================================================= */

export function Inbox() {
  const {
    db,
    empresa,
    session,
    typing,
    selectedAtendimentoId,
    setSelectedAtendimentoId,
    enviarMensagemHumano,
    setAtendimentoStatus,
    simularMensagemCliente,
    abrirNoInbox,
  } = useData()

  const [busca, setBusca] = useState('')
  const [texto, setTexto] = useState('')
  const [mobileAberto, setMobileAberto] = useState(false)
  const [abaInfoAberta, setAbaInfoAberta] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const atendimentos = useMemo(() => {
    return [...db.atendimentos]
      .filter((a) => a.empresa_id === empresa.id)
      .filter((a) => {
        if (!busca.trim()) return true
        const q = busca.toLowerCase()
        return (
          a.cliente_nome.toLowerCase().includes(q) ||
          a.cliente_telefone.includes(q) ||
          (a.ultima_mensagem ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }, [db.atendimentos, empresa.id, busca])

  const selecionado = useMemo<Atendimento | null>(() => {
    if (selectedAtendimentoId) {
      return db.atendimentos.find((a) => a.id === selectedAtendimentoId) ?? null
    }
    return atendimentos[0] ?? null
  }, [selectedAtendimentoId, db.atendimentos, atendimentos])

  const cliente = useMemo<ClienteCRM | undefined>(() => {
    if (!selecionado) return undefined
    return db.clientes_crm.find(
      (c) => c.empresa_id === empresa.id && c.telefone === selecionado.cliente_telefone,
    )
  }, [db.clientes_crm, empresa.id, selecionado])

  const mensagens = useMemo<Mensagem[]>(() => {
    if (!selecionado) return []
    return db.mensagens
      .filter((m) => m.atendimento_id === selecionado.id)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
  }, [db.mensagens, selecionado])

  const digitando = selecionado ? Boolean(typing[selecionado.id]) : false

  useEffect(() => {
    if (!selecionado) return
    if (!selectedAtendimentoId) setSelectedAtendimentoId(selecionado.id)
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [selecionado, selectedAtendimentoId, setSelectedAtendimentoId, mensagens.length])

  function abrirConversa(id: string) {
    setSelectedAtendimentoId(id)
    setMobileAberto(true)
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!selecionado || !texto.trim()) return
    enviarMensagemHumano(selecionado.id, texto.trim())
    setTexto('')
  }

  function assumirConversa() {
    if (!selecionado) return
    setAtendimentoStatus(selecionado.id, 'humano')
  }

  function devolverParaIA() {
    if (!selecionado) return
    setAtendimentoStatus(selecionado.id, 'ia')
  }

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#f0f2f5]">
      {/* ============ LISTA DE CONVERSAS (esquerda) ============ */}
      <aside
        className={cn(
          'flex w-full max-w-[420px] flex-col border-r border-[#d1d7db] bg-white md:flex',
          mobileAberto ? 'hidden' : 'flex',
        )}
      >
        {/* Header verde do WhatsApp */}
        <header className="flex items-center justify-between bg-[#075e54] px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/15">
              <Users className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">Conversas</span>
              <span className="text-[11px] text-white/70">{empresa.nome}</span>
            </div>
          </div>
          <MoreVertical className="size-5 opacity-80" />
        </header>

        {/* Busca */}
        <div className="border-b border-[#e9edef] bg-white p-2">
          <label className="flex items-center gap-2 rounded-lg bg-[#f0f2f5] px-3 py-2 text-sm text-[#54656f]">
            <Search className="size-4" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisar conversa"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#667781]"
            />
          </label>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {atendimentos.length === 0 && (
            <p className="p-6 text-center text-sm text-[#667781]">Nenhuma conversa ainda.</p>
          )}
          {atendimentos.map((a) => {
            const ativo = a.id === selecionado?.id
            const crm = db.clientes_crm.find((c) => c.empresa_id === a.empresa_id && c.telefone === a.cliente_telefone)
            const precisaHumano = a.status === 'humano'
            const iaAtiva = a.status === 'ia'
            return (
              <button
                key={a.id}
                onClick={() => abrirConversa(a.id)}
                className={cn(
                  'flex w-full items-center gap-3 border-b border-[#f2f4f5] px-3 py-3 text-left transition-colors',
                  ativo ? 'bg-[#f0f2f5]' : 'bg-white hover:bg-[#f5f6f6]',
                )}
              >
                <div className="relative">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                    {iniciais(a.cliente_nome)}
                  </div>
                  {precisaHumano && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center rounded-full border-2 border-white bg-red-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[#111b21]">{a.cliente_nome}</p>
                    <span className="text-[11px] text-[#667781]">{horaCurta(a.updated_at)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-[#667781]">
                      {a.ultima_mensagem || 'Sem mensagens ainda'}
                    </p>
                    {iaAtiva && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Sparkles className="size-2.5" /> IA
                      </span>
                    )}
                    {precisaHumano && (
                      <span className="flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        <User className="size-2.5" /> Humano
                      </span>
                    )}
                  </div>
                  {crm && crm.ltv > 0 && (
                    <p className="mt-0.5 text-[10px] text-[#667781]">LTV {brl(crm.ltv)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ============ ÁREA DA CONVERSA (centro) ============ */}
      <main
        className={cn(
          'flex flex-1 flex-col bg-[#efeae2]',
          !mobileAberto && 'hidden md:flex',
          mobileAberto ? 'flex' : '',
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.3) 0%, transparent 55%)',
        }}
      >
        {!selecionado ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#667781]">
            <div className="flex size-20 items-center justify-center rounded-full bg-white/60">
              <Users className="size-10" />
            </div>
            <p className="text-sm">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            {/* Header da conversa */}
            <header className="flex items-center gap-3 border-b border-[#d1d7db] bg-[#f0f2f5] px-4 py-2.5">
              <button
                onClick={() => setMobileAberto(false)}
                className="md:hidden"
                aria-label="Voltar para conversas"
              >
                <ArrowLeft className="size-5 text-[#54656f]" />
              </button>
              <div className="flex size-10 items-center justify-center rounded-full bg-[#dfe5e7] text-sm font-semibold text-[#54656f]">
                {iniciais(selecionado.cliente_nome)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111b21]">{selecionado.cliente_nome}</p>
                <p className="truncate text-[11px] text-[#667781]">
                  {digitando ? (
                    <span className="text-emerald-600">digitando…</span>
                  ) : (
                    selecionado.cliente_telefone
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {selecionado.status === 'ia' ? (
                  <Btn size="sm" variant="outline" onClick={assumirConversa} className="border-[#d1d7db] text-[#54656f]">
                    <User className="mr-1 size-3.5" /> Assumir
                  </Btn>
                ) : selecionado.status === 'humano' ? (
                  <Btn size="sm" tone="vendas" onClick={devolverParaIA}>
                    <Sparkles className="mr-1 size-3.5" /> Devolver à IA
                  </Btn>
                ) : (
                  <Badge tone="neutral">Finalizado</Badge>
                )}
                <button
                  onClick={() => setAbaInfoAberta((v) => !v)}
                  className="hidden rounded-md p-1.5 text-[#54656f] hover:bg-black/5 lg:block"
                  aria-label="Painel de informações"
                >
                  <MoreVertical className="size-5" />
                </button>
              </div>
            </header>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-3 py-4 md:px-8">
              <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
                {mensagens.length === 0 && (
                  <p className="py-10 text-center text-xs text-[#667781]">
                    Nenhuma mensagem ainda. Envie a primeira abaixo.
                  </p>
                )}
                {mensagens.map((m, i) => {
                  const anterior = mensagens[i - 1]
                  const agrupada = anterior && anterior.remetente === m.remetente && intervaloCurto(anterior.created_at, m.created_at)
                  const minhaMsg = m.remetente !== 'cliente'
                  const ehSistema = m.texto.startsWith('[Sistema]')
                  if (ehSistema) {
                    return (
                      <div key={m.id} className="my-2 flex justify-center">
                        <span className="rounded-md bg-white/70 px-3 py-1 text-[11px] italic text-[#54656f]">
                          {m.texto.replace('[Sistema] ', '')}
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={m.id}
                      className={cn('flex w-full', minhaMsg ? 'justify-end' : 'justify-start', agrupada && 'mt-0.5')}
                    >
                      <div
                        className={cn(
                          'relative max-w-[85%] rounded-lg px-3 py-1.5 text-[13.5px] leading-snug text-[#111b21] shadow-sm md:max-w-[70%]',
                          minhaMsg ? 'bg-[#d9fdd3]' : 'bg-white',
                          !agrupada && (minhaMsg ? 'rounded-tr-none' : 'rounded-tl-none'),
                        )}
                      >
                        {m.remetente === 'ia' && (
                          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                            <Sparkles className="size-3" /> IA
                          </div>
                        )}
                        {m.remetente === 'humano' && (
                          <div className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#075e54]">
                            <User className="size-3" /> {session.userName.split(' ')[0]}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{m.texto}</p>
                        <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
                          <span>{horaCurta(m.created_at)}</span>
                          {minhaMsg && (
                            <>
                              <CheckCheck className="size-3.5 text-[#53bdeb]" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {digitando && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-1 rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
                      <span className="size-1.5 animate-bounce rounded-full bg-[#667781] [animation-delay:-0.3s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-[#667781] [animation-delay:-0.15s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-[#667781]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input de mensagem */}
            <form
              onSubmit={enviar}
              className="flex items-center gap-2 border-t border-[#d1d7db] bg-[#f0f2f5] px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => simularMensagemCliente(selecionado.id)}
                title="Simular mensagem do cliente (modo demo)"
                className="rounded-full p-2 text-[#54656f] hover:bg-black/5"
              >
                <Paperclip className="size-5" />
              </button>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite uma mensagem"
                className="flex-1 rounded-full border border-transparent bg-white px-4 py-2 text-sm text-[#111b21] outline-none placeholder:text-[#667781]"
                disabled={selecionado.status === 'finalizado'}
              />
              <button
                type="submit"
                disabled={!texto.trim() || selecionado.status === 'finalizado'}
                className="flex size-10 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#008f6f] disabled:opacity-40"
                aria-label="Enviar"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        )}
      </main>

      {/* ============ PAINEL LATERAL (info do cliente + IA) ============ */}
      {selecionado && abaInfoAberta && (
        <aside className="hidden w-80 flex-col border-l border-[#d1d7db] bg-white lg:flex">
          <div className="flex flex-col items-center gap-2 border-b border-[#e9edef] p-6 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-[#dfe5e7] text-xl font-semibold text-[#54656f]">
              {iniciais(selecionado.cliente_nome)}
            </div>
            <p className="font-semibold text-[#111b21]">{selecionado.cliente_nome}</p>
            <p className="text-xs text-[#667781]">{selecionado.cliente_telefone}</p>
            {cliente && (
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {cliente.tags.map((t) => (
                  <span key={t} className="rounded-full bg-[#e7fce3] px-2 py-0.5 text-[10px] font-semibold text-[#008069]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-[#111b21]">
            {cliente ? (
              <>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                    Valor gasto (LTV)
                  </p>
                  <p className="text-lg font-bold">{brl(cliente.ltv)}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                    Última compra
                  </p>
                  <p>{cliente.ultima_compra ? `${diasDesde(cliente.ultima_compra)} dias atrás` : 'Sem compras'}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                    Score de lead
                  </p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e9edef]">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${cliente.score_lead}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-[#667781]">{cliente.score_lead}/100</p>
                </div>
                {cliente.proxima_acao && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                      Próxima ação sugerida
                    </p>
                    <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900">{cliente.proxima_acao}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-[#667781]">Cliente ainda não está no CRM.</p>
            )}

            <div className="border-t border-[#e9edef] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                Etapa do funil
              </p>
              <p className="rounded-md bg-[#f0f2f5] px-2 py-1 text-xs font-semibold text-[#111b21]">
                {selecionado.etapa_funil.replace('_', ' ')}
              </p>
            </div>

            <div className="border-t border-[#e9edef] pt-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#667781]">
                IA neste atendimento
              </p>
              <p className="text-xs text-[#54656f]">
                {selecionado.status === 'ia'
                  ? 'A IA está respondendo automaticamente.'
                  : selecionado.status === 'humano'
                    ? 'Atendimento assumido por humano. IA pausada.'
                    : 'Atendimento finalizado.'}
              </p>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

/* =========================================================
   Helpers locais
   ========================================================= */

function iniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

function horaCurta(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function intervaloCurto(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 5 * 60 * 1000
}