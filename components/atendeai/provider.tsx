'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type {
  Atendimento,
  Auditoria,
  CatalogoItem,
  ClienteCRM,
  ConfigLocal,
  DB,
  EtapaFunil,
  FuncionarioIA,
  ModuleKey,
  Perfil,
  PosVendaAutomacao,
  Role,
  AcaoSite,
  SiteFormulario,
  SiteVitrine,
  StatusEmpresa,
  TableName,
  TemplateSite,
  VendaPagamento,
  View,
} from '@/lib/types'
import { createSeed, DEFAULT_CONFIG } from '@/lib/seed'
import { addDays, brl, diasDesde, isoDate, nowIso, uid } from '@/lib/format'
import { getSupabase, isSupabaseConfigured, setDemoCookie } from '@/lib/supabase'
import { gerarPixCopiaECola } from '@/lib/pix'
import { PLAYBOOKS, type NovoAgente } from '@/lib/playbooks'
import { novoSite, slugify, sugerirSlug, SLUG_RESERVADOS } from '@/lib/vitrine'
import type { FinAba } from '@/lib/financeiro'
import type { ContextoIA } from '@/lib/ia-contexto'
import {
  calcularScoreLead,
  horariosLivres,
  mensagemClienteSimulada,
  pediuOptOut,
  precisaHumano,
  precoComDesconto,
  primeiraMensagemCampanha,
  responderComoIA,
  resumoParaHumano,
} from '@/lib/ai'

export const DEMO_STORAGE_KEY = 'atendeai360:demo:v2'
const CONFIG_KEY = 'atendeai360:config:v2'

export type AuthState = 'carregando' | 'anonimo' | 'demo' | 'ativo' | 'pendente' | 'suspenso' | 'sem_perfil'
type SyncStatus = 'conectado' | 'demo' | 'sincronizando' | 'erro'

interface Session {
  module: ModuleKey
  role: Role
  perfilId: string | null
  modulos: ModuleKey[] | null
  userName: string
  userEmail: string
  mode: 'demo' | 'conta'
}

interface Toast {
  id: string
  title: string
  description?: string
  tone: 'captacao' | 'ia' | 'vendas' | 'pos' | 'erro'
  action?: { label: string; onClick: () => void }
}

type Row = { id: string }
type Change = { table: TableName; op: 'put' | 'del'; row?: Row; id?: string }

interface Tx {
  db: DB
  put: <T extends TableName>(table: T, row: DB[T][number]) => void
  del: (table: TableName, id: string) => void
}

const DEFAULT_SESSION: Session = {
  module: 'dashboard',
  role: 'empresa',
  perfilId: null,
  modulos: null,
  userName: 'Juliana Martins',
  userEmail: 'juliana@bellaforma.com.br',
  mode: 'demo',
}

const TODOS: ModuleKey[] = ['dashboard', 'radar', 'divulgacao', 'inbox', 'crm', 'agenda', 'vendas', 'pos_venda', 'funcionarios', 'conhecimento', 'catalogo', 'whatsapp', 'meu_site', 'financeiro', 'integracoes', 'equipe', 'auditoria']

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  super_admin: [...TODOS, 'master'],
  empresa: TODOS,
  funcionario: ['dashboard', 'radar', 'inbox', 'crm', 'agenda', 'vendas', 'pos_venda', 'catalogo', 'conhecimento'],
}

const TABLES: TableName[] = [
  'empresas', 'perfis', 'funcionarios_ia', 'catalogo', 'campanhas_divulgacao', 'atendimentos', 'mensagens', 'agendamentos',
  'vendas_pagamentos', 'pos_venda_automacoes', 'whatsapp_conexoes', 'clientes_crm', 'base_conhecimento', 'auditoria', 'integracoes',
  'sites_vitrine', 'sites_galeria', 'sites_depoimentos', 'sites_visitas', 'sites_formularios',
  'financeiro_config', 'financeiro_custos_fixos', 'financeiro_custos_variaveis', 'financeiro_despesas', 'financeiro_simulacoes', 'financeiro_metas',
]

const emptyDb = (): DB => Object.fromEntries(TABLES.map((t) => [t, []])) as unknown as DB

function scopeDb(db: DB, empresaId: string): DB {
  const by = <T extends { empresa_id: string }>(arr: T[]) => arr.filter((x) => x.empresa_id === empresaId)
  const atendimentos = by(db.atendimentos)
  const ids = new Set(atendimentos.map((a) => a.id))
  return {
    empresas: db.empresas,
    perfis: by(db.perfis),
    funcionarios_ia: by(db.funcionarios_ia),
    catalogo: by(db.catalogo),
    campanhas_divulgacao: by(db.campanhas_divulgacao),
    atendimentos,
    mensagens: db.mensagens.filter((m) => ids.has(m.atendimento_id)),
    agendamentos: by(db.agendamentos),
    vendas_pagamentos: by(db.vendas_pagamentos),
    pos_venda_automacoes: by(db.pos_venda_automacoes),
    whatsapp_conexoes: by(db.whatsapp_conexoes),
    clientes_crm: by(db.clientes_crm),
    base_conhecimento: by(db.base_conhecimento),
    auditoria: by(db.auditoria).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    integracoes: by(db.integracoes),
    sites_vitrine: by(db.sites_vitrine),
    sites_galeria: by(db.sites_galeria).sort((a, b) => a.ordem - b.ordem),
    sites_depoimentos: by(db.sites_depoimentos).sort((a, b) => a.ordem - b.ordem),
    sites_visitas: by(db.sites_visitas),
    sites_formularios: by(db.sites_formularios).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    financeiro_config: by(db.financeiro_config),
    financeiro_custos_fixos: by(db.financeiro_custos_fixos),
    financeiro_custos_variaveis: by(db.financeiro_custos_variaveis),
    financeiro_despesas: by(db.financeiro_despesas),
    financeiro_simulacoes: by(db.financeiro_simulacoes).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    financeiro_metas: by(db.financeiro_metas),
  }
}

const VIEW_PATH: Record<View, string> = { landing: '/', login: '/login', cadastro: '/cadastro', app: '/painel' }

function useAtendeAIState() {
  const router = useRouter()
  const pathname = usePathname()
  const [db, setDb] = useState<DB | null>(null)
  const [empresaId, setEmpresaId] = useState('')
  const [config, setConfig] = useState<ConfigLocal>(DEFAULT_CONFIG)
  const [session, setSession] = useState<Session>(DEFAULT_SESSION)
  const [authState, setAuthState] = useState<AuthState>('carregando')
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('sincronizando')
  const [typing, setTyping] = useState<Record<string, boolean>>({})
  const [selectedAtendimentoId, setSelectedAtendimentoId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [copilotoAberto, setCopilotoAberto] = useState(false)
  const [finAba, setFinAba] = useState<FinAba>('dashboard')

  const dbRef = useRef<DB | null>(null)
  const empresaRef = useRef('')
  const configRef = useRef(config)
  const sessionRef = useRef(session)
  configRef.current = config
  empresaRef.current = empresaId
  sessionRef.current = session

  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = uid()
      setToasts((t) => [...t.slice(-3), { ...toast, id }])
      setTimeout(() => dismiss(id), toast.action ? 9000 : 4500)
    },
    [dismiss],
  )

  const pushRemote = useCallback(
    async (changes: Change[]) => {
      if (sessionRef.current.mode !== 'conta') return
      const supabase = getSupabase()
      if (!supabase) return
      for (const c of changes) {
        const res =
          c.op === 'put'
            ? await supabase.from(c.table).upsert(c.row as never)
            : await supabase.from(c.table).delete().eq('id', c.id as string)
        if (res.error) {
          console.error(`[AtendeAI] Falha ao salvar em ${c.table}:`, res.error.message)
          setSyncStatus('erro')
          notify({ title: 'Não foi possível salvar', description: res.error.message, tone: 'erro' })
          return
        }
      }
      setSyncStatus('conectado')
    },
    [notify],
  )

  const commit = useCallback((draft: DB) => {
    dbRef.current = draft
    setDb(draft)
  }, [])

  const tx = useCallback(
    (fn: (t: Tx) => void) => {
      if (!dbRef.current) return
      const draft = structuredClone(dbRef.current)
      const changes: Change[] = []
      const t: Tx = {
        db: draft,
        put: (table, row) => {
          const arr = draft[table] as unknown as Row[]
          const r = row as unknown as Row
          const i = arr.findIndex((x) => x.id === r.id)
          if (i >= 0) arr[i] = r
          else arr.push(r)
          changes.push({ table, op: 'put', row: r })
        },
        del: (table, id) => {
          const arr = draft[table] as unknown as Row[]
          const i = arr.findIndex((x) => x.id === id)
          if (i >= 0) arr.splice(i, 1)
          changes.push({ table, op: 'del', id })
        },
      }
      fn(t)
      commit(draft)
      void pushRemote(changes)
    },
    [pushRemote, commit],
  )

  // ---------- Carregamento ----------
  const loadDemo = useCallback(() => {
    let payload: { db: DB; empresaId: string } | null = null
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY)
      if (raw) payload = JSON.parse(raw)
    } catch {
      payload = null
    }
    if (!payload?.db?.empresas?.length || !payload.db.clientes_crm || !payload.db.sites_vitrine || !payload.db.financeiro_config) payload = createSeed()
    commit(payload.db)
    setEmpresaId(payload.empresaId)
    setSession((s) => ({ ...DEFAULT_SESSION, module: s.module, role: s.mode === 'demo' ? s.role : 'empresa', mode: 'demo' }))
    setSyncStatus('demo')
    setAuthState('demo')
  }, [commit])

  const loadRemote = useCallback(async (): Promise<AuthState> => {
    const supabase = getSupabase()
    if (!supabase) return 'anonimo'
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return 'anonimo'
    setSyncStatus('sincronizando')
    const { data: perfil, error } = await supabase.from('perfis').select('*').eq('auth_user_id', auth.user.id).maybeSingle()
    if (error || !perfil) {
      setAuthState('sem_perfil')
      return 'sem_perfil'
    }
    const p = perfil as Perfil
    const { data: emp } = await supabase.from('empresas').select('*').eq('id', p.empresa_id).maybeSingle()
    const status = (emp?.status ?? 'pendente') as StatusEmpresa
    setSession({
      module: 'dashboard',
      role: p.role,
      perfilId: p.id,
      modulos: p.modulos,
      userName: p.nome,
      userEmail: p.email,
      mode: 'conta',
    })
    setEmpresaId(p.empresa_id)
    if (p.role !== 'super_admin' && status !== 'ativo') {
      commit({ ...emptyDb(), empresas: emp ? [emp] : [], perfis: [p] })
      const st: AuthState = status === 'suspenso' ? 'suspenso' : 'pendente'
      setAuthState(st)
      return st
    }
    const results = await Promise.all(
      TABLES.map((tb) =>
        tb === 'mensagens'
          ? supabase.from(tb).select('*').order('created_at', { ascending: false }).limit(3000)
          : supabase.from(tb).select('*').limit(2000),
      ),
    )
    const fail = results.find((r) => r.error)
    if (fail?.error) {
      console.error('[AtendeAI] Falha ao carregar dados:', fail.error.message)
      setSyncStatus('erro')
    } else setSyncStatus('conectado')
    const next = emptyDb() as unknown as Record<TableName, Row[]>
    TABLES.forEach((tb, i) => {
      next[tb] = ((results[i].data ?? []) as Row[]).map((r) => {
        const x = r as Record<string, unknown>
        for (const k of ['preco', 'valor', 'valor_estimado', 'ltv', 'desconto_oferta', 'nota', 'custo_aquisicao', 'custo_mao_obra', 'comissao_percentual', 'faturamento_estimado', 'aliquota_efetiva', 'comissao_padrao', 'das_mei', 'meta_faturamento', 'meta_lucro']) if (typeof x[k] === 'string') x[k] = Number(x[k])
        return r
      })
    })
    next.mensagens.reverse()
    commit(next as unknown as DB)
    setAuthState('ativo')
    return 'ativo'
  }, [commit])

  useEffect(() => {
    try {
      const c = localStorage.getItem(CONFIG_KEY)
      if (c) setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(c) })
    } catch {
      /* ignora */
    }
    const demo = document.cookie.split('; ').some((c) => c === 'atendeai_demo=1')
    let cancelled = false
    ;(async () => {
      const st = isSupabaseConfigured && !demo ? await loadRemote().catch(() => 'anonimo' as AuthState) : 'anonimo'
      if (cancelled) return
      if (st === 'anonimo') {
        if (demo) loadDemo()
        else {
          setAuthState('anonimo')
          setSyncStatus('demo')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadDemo, loadRemote])

  // Persistência local SOMENTE para o modo demonstração (nunca para auth ou dados reais)
  useEffect(() => {
    if (!db || session.mode !== 'demo' || authState !== 'demo') return
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ db, empresaId }))
    } catch {
      /* armazenamento indisponível */
    }
  }, [db, empresaId, session.mode, authState])

  // Demonstração: a vitrine aberta em outra aba (leads, visitas) reflete no painel sem recarregar
  useEffect(() => {
    if (authState !== 'demo') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DEMO_STORAGE_KEY || !e.newValue) return
      try {
        const p = JSON.parse(e.newValue) as { db: DB }
        if (p.db?.sites_vitrine) commit(p.db)
      } catch {
        /* ignora */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [authState, commit])

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
    } catch {
      /* ignora */
    }
  }, [config])

  // Realtime: mensagens recebidas pelo webhook do WhatsApp aparecem no Inbox ao vivo
  useEffect(() => {
    if (authState !== 'ativo') return
    const supabase = getSupabase()
    if (!supabase) return
    const merge = (table: 'mensagens' | 'atendimentos', row: Row) => {
      const cur = dbRef.current
      if (!cur) return
      const draft = { ...cur, [table]: [...cur[table]] } as DB
      const arr = draft[table] as unknown as Row[]
      const i = arr.findIndex((x) => x.id === row.id)
      if (i >= 0) arr[i] = row
      else arr.push(row)
      commit(draft)
    }
    const ch = supabase
      .channel('atendeai-inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (p) => merge('mensagens', p.new as Row))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos' }, (p) => p.new && merge('atendimentos', p.new as Row))
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [authState, commit])

  const data = useMemo(() => (db ? scopeDb(db, empresaId) : null), [db, empresaId])
  const empresa = useMemo(() => db?.empresas.find((e) => e.id === empresaId) ?? db?.empresas[0] ?? null, [db, empresaId])
  const allowedModules = useMemo<ModuleKey[]>(() => {
    const base = ROLE_MODULES[session.role]
    return session.role === 'funcionario' && session.modulos?.length ? base.filter((m) => session.modulos!.includes(m)) : base
  }, [session.role, session.modulos])

  // ---------- Navegação e sessão ----------
  const navigate = useCallback(
    (view: View) => {
      router.push(VIEW_PATH[view])
      if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
    },
    [router],
  )
  const goModule = useCallback(
    (module: ModuleKey) => {
      setSession((s) => ({ ...s, module }))
      if (!pathname?.startsWith('/painel')) router.push('/painel')
    },
    [pathname, router],
  )
  const setRole = useCallback(
    (role: Role) => {
      if (sessionRef.current.mode !== 'demo') return
      setSession((s) => ({ ...s, role, module: ROLE_MODULES[role].includes(s.module) ? s.module : 'dashboard' }))
    },
    [],
  )

  const loginDemo = useCallback(() => {
    setDemoCookie(true)
    loadDemo()
    setSession({ ...DEFAULT_SESSION })
    router.push('/painel')
    notify({ title: 'Modo Demonstração ativo', description: 'Dados fictícios — nada é enviado de verdade.', tone: 'vendas' })
  }, [loadDemo, router, notify])

  const logout = useCallback(async () => {
    try {
      await getSupabase()?.auth.signOut()
    } catch {
      /* ignora */
    }
    setDemoCookie(false)
    commit(emptyDb())
    setEmpresaId('')
    setSession(DEFAULT_SESSION)
    setAuthState('anonimo')
    router.push('/')
    router.refresh()
  }, [commit, router])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string; state?: AuthState }> => {
      const supabase = getSupabase()
      if (!supabase) return { error: 'Autenticação indisponível: o Supabase não está configurado neste ambiente. Use o Modo Demonstração.' }
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message }
      setDemoCookie(false)
      const state = await loadRemote()
      router.push('/painel')
      router.refresh()
      return { state }
    },
    [loadRemote, router],
  )

  const signUp = useCallback(
    async (p: { nome: string; empresa_nome: string; segmento: string; cnpj: string; email: string; password: string }): Promise<{ error?: string; info?: string }> => {
      const supabase = getSupabase()
      if (!supabase) return { error: 'Cadastro indisponível: o Supabase não está configurado neste ambiente.' }
      const { data: res, error } = await supabase.auth.signUp({
        email: p.email,
        password: p.password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/painel` : undefined,
          data: { nome: p.nome, empresa_nome: p.empresa_nome, segmento: p.segmento, cnpj: p.cnpj },
        },
      })
      if (error) return { error: error.message }
      setDemoCookie(false)
      if (res.session) {
        await loadRemote()
        router.push('/painel')
        return {}
      }
      return { info: 'Cadastro recebido! Confirme seu e-mail. Depois disso, sua conta passará pela aprovação do administrador.' }
    },
    [loadRemote, router],
  )

  const recarregar = useCallback(async () => {
    const st = await loadRemote()
    if (st === 'ativo') notify({ title: 'Conta aprovada!', description: 'Bem-vindo ao AtendeAI 360.', tone: 'vendas' })
    return st
  }, [loadRemote, notify])

  // ---------- Auditoria e CRM ----------
  const logTx = (t: Tx, ator: Auditoria['ator'], acao: string, detalhe = '', empresa_id = empresaRef.current) => {
    t.put('auditoria', {
      id: uid(),
      empresa_id,
      ator,
      ator_nome: ator === 'usuario' ? sessionRef.current.userName : ator === 'ia' ? 'IA' : 'Sistema',
      acao,
      detalhe,
      created_at: nowIso(),
    })
  }

  const upsertClienteTx = (
    t: Tx,
    p: { empresa_id: string; nome: string; telefone: string; compra?: number; proxima_acao?: string; tag?: string; patch?: Partial<ClienteCRM> },
  ) => {
    const atual = t.db.clientes_crm.find((c) => c.empresa_id === p.empresa_id && c.telefone === p.telefone)
    const agora = nowIso()
    const base: ClienteCRM = atual ?? {
      id: uid(),
      empresa_id: p.empresa_id,
      nome: p.nome,
      telefone: p.telefone,
      email: '',
      aniversario: null,
      preferencias: '',
      tags: [],
      ltv: 0,
      score_lead: 20,
      ultima_compra: null,
      ultima_interacao: agora,
      proxima_acao: '',
      opt_in: true,
      opt_out: false,
      created_at: agora,
    }
    const tags = p.tag && !base.tags.includes(p.tag) ? [...base.tags, p.tag] : base.tags
    const row: ClienteCRM = {
      ...base,
      ...p.patch,
      tags,
      ultima_interacao: agora,
      ...(p.compra ? { ltv: Math.round((base.ltv + p.compra) * 100) / 100, ultima_compra: agora } : {}),
      ...(p.proxima_acao ? { proxima_acao: p.proxima_acao } : {}),
    }
    t.put('clientes_crm', row)
    return row
  }

  // ---------- CRUD genérico ----------
  const upsert = useCallback(
    <T extends TableName>(table: T, row: DB[T][number], audit?: string) =>
      tx((t) => {
        t.put(table, row)
        if (audit) logTx(t, 'usuario', audit)
      }),
    [tx],
  )
  const remove = useCallback(
    (table: TableName, id: string, audit?: string) =>
      tx((t) => {
        t.del(table, id)
        if (audit) logTx(t, 'usuario', audit)
      }),
    [tx],
  )
  const updateConfig = useCallback((partial: Partial<ConfigLocal>) => setConfig((c) => ({ ...c, ...partial })), [])
  const switchEmpresa = useCallback((id: string) => {
    setEmpresaId(id)
    setSession((s) => ({ ...s, module: 'dashboard' }))
  }, [])
  const resetDemo = useCallback(() => {
    if (sessionRef.current.mode !== 'demo') return
    const seed = createSeed()
    commit(seed.db)
    setEmpresaId(seed.empresaId)
    setConfig(DEFAULT_CONFIG)
    notify({ title: 'Dados de demonstração restaurados', tone: 'vendas' })
  }, [notify, commit])

  // ---------- Helpers do funil ----------
  const funcionarioPara = (d: DB, at: Atendimento): FuncionarioIA | undefined => {
    const ativos = d.funcionarios_ia.filter((f) => f.empresa_id === at.empresa_id && f.ativo)
    const camp = d.campanhas_divulgacao.find((c) => c.empresa_id === at.empresa_id && c.titulo === at.origem_campanha)
    const funcaoEtapa =
      at.etapa_funil === 'pos_venda' || at.etapa_funil === 'concluido'
        ? 'pos_venda'
        : at.etapa_funil === 'agendado'
          ? 'agendamento'
          : at.etapa_funil === 'captado'
            ? 'atendimento'
            : 'vendas'
    const porFuncao = ativos.find((f) => f.funcao === funcaoEtapa)
    if (porFuncao && (funcaoEtapa === 'pos_venda' || !camp)) return porFuncao
    return ativos.find((f) => f.id === camp?.funcionario_ia_id) ?? porFuncao ?? ativos.find((f) => f.funcao === 'vendas') ?? ativos[0]
  }

  const enviarWhatsApp = (telefone: string, texto: string) => {
    if (sessionRef.current.mode !== 'conta') return
    const conn = dbRef.current?.whatsapp_conexoes.find((w) => w.empresa_id === empresaRef.current)
    if (conn?.status !== 'conectado') return
    void fetch('/api/whatsapp/enviar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, texto }),
    }).catch(() => undefined)
  }

  const addMsg = (t: Tx, atendimentoId: string, remetente: 'cliente' | 'ia' | 'humano', texto: string, patch?: Partial<Atendimento>) => {
    const created = nowIso()
    t.put('mensagens', { id: uid(), atendimento_id: atendimentoId, remetente, texto, created_at: created })
    const at = t.db.atendimentos.find((a) => a.id === atendimentoId)
    if (at) {
      t.put('atendimentos', { ...at, ...patch, ultima_mensagem: texto, updated_at: created })
      if (remetente !== 'cliente' && !texto.startsWith('[Sistema]')) enviarWhatsApp(at.cliente_telefone, texto)
    }
  }

  const abrirNoInbox = useCallback(
    (atendimentoId: string) => {
      setSelectedAtendimentoId(atendimentoId)
      goModule('inbox')
    },
    [goModule],
  )

  const montarContexto = (d: DB, at: Atendimento | null, funcionario: FuncionarioIA | undefined, etapa: EtapaFunil): ContextoIA => {
    const eid = at?.empresa_id ?? empresaRef.current
    const emp = d.empresas.find((e) => e.id === eid)
    const cli = at ? d.clientes_crm.find((c) => c.empresa_id === eid && c.telefone === at.cliente_telefone) : null
    return {
      empresa: { nome: emp?.nome ?? '', segmento: emp?.segmento ?? '' },
      funcionario,
      cliente: cli ? { nome: cli.nome, preferencias: cli.preferencias, tags: cli.tags, ltv: cli.ltv, ultima_compra: cli.ultima_compra } : null,
      catalogo: d.catalogo.filter((c) => c.empresa_id === eid && c.ativo).map(({ nome, preco, duracao_minutos, descricao }) => ({ nome, preco, duracao_minutos, descricao })),
      conhecimento: d.base_conhecimento.filter((k) => k.empresa_id === eid && k.status === 'ativo').map(({ categoria, titulo, conteudo }) => ({ categoria, titulo, conteudo })),
      horariosLivres: horariosLivres(d.agendamentos.filter((a) => a.empresa_id === eid)).map((h) => `${h.data.split('-').reverse().slice(0, 2).join('/')} ${h.horario}`),
      historico: at ? d.mensagens.filter((m) => m.atendimento_id === at.id && !m.texto.startsWith('[Sistema]')).slice(-12).map(({ remetente, texto }) => ({ remetente, texto })) : [],
      etapa,
    }
  }

  const gerarResposta = async (contexto: ContextoIA, texto: string, local: () => string) => {
    try {
      const res = await fetch('/api/ia/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contexto, texto }),
      })
      if (res.ok) {
        const j = (await res.json()) as { texto?: string }
        if (j.texto) return { texto: j.texto, fonte: 'llm' as const }
      }
    } catch {
      /* cai no motor local */
    }
    return { texto: local(), fonte: 'local' as const }
  }

  const iaResponder = useCallback(
    async (atendimentoId: string, textoCliente: string) => {
      const d = dbRef.current
      const at = d?.atendimentos.find((a) => a.id === atendimentoId)
      if (!d || !at || at.status !== 'ia') return
      const emp = d.empresas.find((e) => e.id === at.empresa_id)
      if (!emp) return

      if (pediuOptOut(textoCliente)) {
        tx((t) => {
          upsertClienteTx(t, { empresa_id: at.empresa_id, nome: at.cliente_nome, telefone: at.cliente_telefone, patch: { opt_out: true, opt_in: false } })
          addMsg(t, atendimentoId, 'ia', 'Pronto, você não receberá mais mensagens promocionais. Se precisar, é só chamar por aqui.')
          logTx(t, 'ia', 'Registrou opt-out', at.cliente_nome)
        })
        return
      }

      if (precisaHumano(textoCliente)) {
        tx((t) => {
          const msgs = t.db.mensagens.filter((m) => m.atendimento_id === atendimentoId)
          addMsg(t, atendimentoId, 'ia', 'Entendi! Vou te passar agora para alguém da nossa equipe, só um instante.', { status: 'humano' })
          t.put('mensagens', { id: uid(), atendimento_id: atendimentoId, remetente: 'ia', texto: `[Sistema] ${resumoParaHumano({ cliente: at.cliente_nome, mensagens: msgs, etapa: at.etapa_funil })}`, created_at: nowIso() })
          logTx(t, 'ia', 'Transferiu para humano', `${at.cliente_nome}: "${textoCliente.slice(0, 100)}"`)
        })
        notify({
          title: `${at.cliente_nome.split(' ')[0]} precisa de um humano`,
          description: 'A IA pausou e deixou um resumo da conversa.',
          tone: 'erro',
          action: { label: 'Assumir conversa', onClick: () => abrirNoInbox(atendimentoId) },
        })
        return
      }

      setTyping((s) => ({ ...s, [atendimentoId]: true }))
      const funcionario = funcionarioPara(d, at)
      const camp = d.campanhas_divulgacao.find((c) => c.empresa_id === at.empresa_id && c.titulo === at.origem_campanha)
      const inicio = Date.now()
      const { texto: resposta, fonte } = await gerarResposta(montarContexto(d, at, funcionario, at.etapa_funil), textoCliente, () =>
        responderComoIA({
          texto: textoCliente,
          cliente: at.cliente_nome,
          funcionario,
          catalogo: d.catalogo.filter((c) => c.empresa_id === at.empresa_id),
          agendamentos: d.agendamentos.filter((a) => a.empresa_id === at.empresa_id),
          campanha: camp,
          empresa: emp,
          etapa: at.etapa_funil,
        }),
      )
      // Atraso humanizado mínimo
      const espera = Math.max(0, 900 + Math.min(1600, resposta.length * 12) - (Date.now() - inicio))
      await new Promise((r) => setTimeout(r, espera))
      setTyping((s) => ({ ...s, [atendimentoId]: false }))
      tx((t) => {
        const atual = t.db.atendimentos.find((a) => a.id === atendimentoId)
        if (!atual || atual.status !== 'ia') return
        addMsg(t, atendimentoId, 'ia', resposta, atual.etapa_funil === 'captado' ? { etapa_funil: 'em_negociacao' } : undefined)
        if (fonte === 'local' && t.db.auditoria.filter((a) => a.acao === 'IA em modo local').length === 0)
          logTx(t, 'sistema', 'IA em modo local', 'LLM indisponível; usando o motor de regras.')
      })
    },
    [tx, notify, abrirNoInbox],
  )

  const registrarNpsTx = (t: Tx, telefone: string, nota: number) => {
    const alvo = [...t.db.pos_venda_automacoes]
      .filter((p) => p.cliente_telefone === telefone && p.empresa_id === empresaRef.current && p.tipo_acao === 'pesquisa_nps' && p.status !== 'respondido')
      .sort((a, b) => (a.status === 'enviado' ? -1 : 1) - (b.status === 'enviado' ? -1 : 1))[0]
    if (alvo) t.put('pos_venda_automacoes', { ...alvo, nota_nps: nota, status: 'respondido' })
  }

  // ---------- Automação 1: Divulgação -> Inbox ----------
  const abrirLeadTx = (t: Tx, p: { empresa_id: string; nome: string; telefone: string; campanhaId?: string; texto: string; origem: string; etapa?: EtapaFunil; valor?: number }) => {
    let at = t.db.atendimentos.find((a) => a.empresa_id === p.empresa_id && a.cliente_telefone === p.telefone)
    const created = nowIso()
    if (!at) {
      at = {
        id: uid(),
        empresa_id: p.empresa_id,
        cliente_nome: p.nome,
        cliente_telefone: p.telefone,
        origem_campanha: p.origem,
        etapa_funil: p.etapa ?? 'captado',
        status: 'ia',
        valor_estimado: p.valor ?? 0,
        ultima_mensagem: p.texto,
        updated_at: created,
      }
      t.put('atendimentos', at)
    } else t.put('atendimentos', { ...at, origem_campanha: p.origem, status: 'ia', etapa_funil: p.etapa ?? at.etapa_funil })
    addMsg(t, at.id, 'ia', p.texto)
    upsertClienteTx(t, { empresa_id: p.empresa_id, nome: p.nome, telefone: p.telefone, tag: p.origem })
    return at.id
  }

  const simularLeadCampanha = useCallback(
    (campanhaId: string) => {
      const nomes = ['Ana', 'Larissa', 'Gabriela', 'Vanessa', 'Priscila', 'Letícia', 'Bruna', 'Amanda', 'Isabela', 'Carolina']
      const sobrenomes = ['Souza', 'Lima', 'Rocha', 'Nogueira', 'Batista', 'Moreira']
      const nome = `${nomes[Math.floor(Math.random() * nomes.length)]} ${sobrenomes[Math.floor(Math.random() * sobrenomes.length)]}`
      const tel = `119${Math.floor(10000000 + Math.random() * 89999999)}`
      let atendimentoId = ''
      let titulo = ''
      tx((t) => {
        const camp = t.db.campanhas_divulgacao.find((c) => c.id === campanhaId)
        if (!camp) return
        titulo = camp.titulo
        t.put('campanhas_divulgacao', { ...camp, cliques: camp.cliques + 1, leads_gerados: camp.leads_gerados + 1 })
        const item = t.db.catalogo.find((c) => c.id === camp.catalogo_id)
        const emp = t.db.empresas.find((e) => e.id === camp.empresa_id)!
        const func = t.db.funcionarios_ia.find((f) => f.id === camp.funcionario_ia_id)
        const texto = primeiraMensagemCampanha({ cliente: nome, funcionario: func, campanha: camp, item, empresa: emp })
        atendimentoId = abrirLeadTx(t, {
          empresa_id: camp.empresa_id,
          nome,
          telefone: tel,
          texto,
          origem: camp.titulo,
          valor: item ? precoComDesconto(item.preco, camp.desconto_oferta) : 0,
        })
        logTx(t, 'ia', 'Abordou lead de campanha', `${nome} · ${camp.titulo}`)
      })
      if (titulo)
        notify({
          title: `Novo lead captado: ${nome}`,
          description: `Veio da campanha "${titulo}". A IA já enviou a 1ª mensagem.`,
          tone: 'captacao',
          action: { label: 'Abrir conversa no Inbox', onClick: () => abrirNoInbox(atendimentoId) },
        })
      return atendimentoId
    },
    [tx, notify, abrirNoInbox],
  )

  /** Disparo segmentado com respeito a opt-in/opt-out e intervalo humanizado entre mensagens. */
  const dispararCampanhaSegmento = useCallback(
    (p: { campanhaId?: string; filtro: 'inativos' | 'todos' | 'aniversariantes'; dias?: number; mensagem?: string }) => {
      const d = dbRef.current
      if (!d) return 0
      const eid = empresaRef.current
      const camp = d.campanhas_divulgacao.find((c) => c.id === p.campanhaId)
      const cupom = configRef.current.cupom_fidelidade
      const mes = new Date().getMonth() + 1
      const elegiveis = d.clientes_crm
        .filter((c) => c.empresa_id === eid && c.opt_in && !c.opt_out)
        .filter((c) =>
          p.filtro === 'inativos'
            ? diasDesde(c.ultima_compra ?? c.ultima_interacao) >= (p.dias ?? 60)
            : p.filtro === 'aniversariantes'
              ? Number(c.aniversario?.split('-')[1]) === mes
              : true,
        )
        .slice(0, 50)
      elegiveis.forEach((c, i) => {
        setTimeout(() => {
          tx((t) => {
            const primeiro = c.nome.split(' ')[0]
            const texto =
              p.mensagem?.replace('{nome}', primeiro) ??
              (camp
                ? `Oi ${primeiro}! ${camp.copy_anuncio.split('\n')[0]} Responda SAIR se não quiser mais receber.`
                : `Oi ${primeiro}! Sentimos sua falta. Use o cupom ${cupom} e ganhe ${configRef.current.desconto_cupom}% OFF na próxima visita. Quer que eu veja um horário? (Responda SAIR para não receber mais)`)
            abrirLeadTx(t, { empresa_id: eid, nome: c.nome, telefone: c.telefone, texto, origem: camp?.titulo ?? `Reativação · ${p.filtro}`, etapa: 'em_negociacao' })
          })
        }, i * (1500 + Math.random() * 1500))
      })
      tx((t) => logTx(t, 'usuario', 'Disparou campanha segmentada', `${elegiveis.length} clientes · filtro ${p.filtro}${p.dias ? ` ${p.dias}d` : ''}`))
      notify({
        title: `Campanha disparada para ${elegiveis.length} clientes`,
        description: 'Somente clientes com opt-in, com intervalo humanizado entre envios.',
        tone: 'captacao',
        action: { label: 'Ver Inbox', onClick: () => goModule('inbox') },
      })
      return elegiveis.length
    },
    [tx, notify, goModule],
  )

  // ---------- Inbox ----------
  const simularMensagemCliente = useCallback(
    (atendimentoId: string, texto?: string) => {
      const at = dbRef.current?.atendimentos.find((a) => a.id === atendimentoId)
      if (!at) return
      const msg = texto?.trim() || mensagemClienteSimulada(at.etapa_funil)
      const nota = msg.match(/\b(10|[0-9])\b/)
      tx((t) => {
        const status = t.db.atendimentos.find((a) => a.id === atendimentoId)?.status
        addMsg(t, atendimentoId, 'cliente', msg, status === 'finalizado' ? { status: 'ia' } : undefined)
        if (at.etapa_funil === 'pos_venda' && nota) registrarNpsTx(t, at.cliente_telefone, Number(nota[1]))
        const textos = t.db.mensagens.filter((m) => m.atendimento_id === atendimentoId && m.remetente === 'cliente').map((m) => m.texto)
        const cli = t.db.clientes_crm.find((c) => c.empresa_id === at.empresa_id && c.telefone === at.cliente_telefone)
        upsertClienteTx(t, {
          empresa_id: at.empresa_id,
          nome: at.cliente_nome,
          telefone: at.cliente_telefone,
          patch: { score_lead: calcularScoreLead({ mensagensCliente: textos.length, textos, ltv: cli?.ltv ?? 0, etapa: at.etapa_funil }) },
        })
      })
      void iaResponder(atendimentoId, msg)
    },
    [tx, iaResponder],
  )

  const enviarMensagemHumano = useCallback(
    (atendimentoId: string, texto: string) =>
      tx((t) => {
        addMsg(t, atendimentoId, 'humano', texto, { status: 'humano' })
      }),
    [tx],
  )

  const setEtapa = useCallback(
    (atendimentoId: string, etapa: EtapaFunil) =>
      tx((t) => {
        const at = t.db.atendimentos.find((a) => a.id === atendimentoId)
        if (!at) return
        t.put('atendimentos', { ...at, etapa_funil: etapa, updated_at: nowIso() })
        logTx(t, 'usuario', 'Moveu etapa do funil', `${at.cliente_nome} → ${etapa}`)
      }),
    [tx],
  )

  const setAtendimentoStatus = useCallback(
    (atendimentoId: string, status: Atendimento['status']) =>
      tx((t) => {
        const at = t.db.atendimentos.find((a) => a.id === atendimentoId)
        if (!at) return
        t.put('atendimentos', { ...at, status, updated_at: nowIso() })
        const aviso =
          status === 'humano' ? 'Atendimento assumido por um atendente humano. A IA está pausada.' : status === 'ia' ? 'Atendimento devolvido para o Funcionário de IA.' : 'Atendimento finalizado.'
        t.put('mensagens', { id: uid(), atendimento_id: atendimentoId, remetente: status === 'humano' ? 'humano' : 'ia', texto: `[Sistema] ${aviso}`, created_at: nowIso() })
        logTx(t, 'usuario', status === 'humano' ? 'Assumiu conversa' : status === 'ia' ? 'Devolveu conversa à IA' : 'Finalizou atendimento', at.cliente_nome)
      }),
    [tx],
  )

  // ---------- Automação 2: Agendar / PIX / Concluir ----------
  const agendarHorario = useCallback(
    (atendimentoId: string, p: { catalogoId: string; data: string; horario: string }) => {
      tx((t) => {
        const at = t.db.atendimentos.find((a) => a.id === atendimentoId)
        const item = t.db.catalogo.find((c) => c.id === p.catalogoId)
        if (!at || !item) return
        const camp = t.db.campanhas_divulgacao.find((c) => c.empresa_id === at.empresa_id && c.titulo === at.origem_campanha)
        const valor = precoComDesconto(item.preco, camp?.catalogo_id === item.id ? camp.desconto_oferta : 0)
        t.put('agendamentos', {
          id: uid(),
          empresa_id: at.empresa_id,
          cliente_nome: at.cliente_nome,
          cliente_telefone: at.cliente_telefone,
          servico_nome: item.nome,
          valor,
          data: p.data,
          horario: p.horario,
          status: 'confirmado',
          pagamento_status: 'pendente',
          created_at: nowIso(),
        })
        const [y, m, d] = p.data.split('-')
        addMsg(t, atendimentoId, 'ia', `Prontinho, ${at.cliente_nome.split(' ')[0]}! Seu horário de ${item.nome} está confirmado para ${d}/${m}/${y} às ${p.horario}. Valor: ${brl(valor)}.`, {
          etapa_funil: 'agendado',
          valor_estimado: valor,
        })
        upsertClienteTx(t, { empresa_id: at.empresa_id, nome: at.cliente_nome, telefone: at.cliente_telefone, proxima_acao: `Atendimento ${d}/${m} ${p.horario}` })
        logTx(t, 'ia', 'Agendou horário', `${at.cliente_nome} · ${item.nome} · ${d}/${m} ${p.horario}`)
      })
      notify({ title: 'Horário agendado', description: 'Etapa do funil atualizada para "Agendado".', tone: 'captacao' })
    },
    [tx, notify],
  )

  const enviarCobrancaPix = useCallback(
    (atendimentoId: string, catalogoId: string) => {
      let vendaId = ''
      tx((t) => {
        const at = t.db.atendimentos.find((a) => a.id === atendimentoId)
        const item = t.db.catalogo.find((c) => c.id === catalogoId)
        const emp = t.db.empresas.find((e) => e.id === at?.empresa_id)
        if (!at || !item || !emp) return
        const camp = t.db.campanhas_divulgacao.find((c) => c.empresa_id === at.empresa_id && c.titulo === at.origem_campanha)
        const valor = precoComDesconto(item.preco, camp?.catalogo_id === item.id ? camp.desconto_oferta : 0)
        vendaId = uid()
        const codigo = gerarPixCopiaECola({
          chave: emp.chave_pix,
          nome: configRef.current.recebedor_nome || emp.nome,
          cidade: configRef.current.recebedor_cidade,
          valor,
          txid: `ATD${vendaId.replace(/-/g, '').slice(0, 10)}`,
        })
        t.put('vendas_pagamentos', {
          id: vendaId,
          empresa_id: at.empresa_id,
          atendimento_id: at.id,
          cliente_nome: at.cliente_nome,
          cliente_telefone: at.cliente_telefone,
          item_nome: item.nome,
          valor,
          metodo: 'pix',
          codigo_pix: codigo,
          status: 'pendente',
          created_at: nowIso(),
        })
        addMsg(t, atendimentoId, 'ia', `Aqui está sua cobrança PIX de ${item.nome}.\nValor: ${brl(valor)}\n\nPIX Copia e Cola:\n${codigo}\n\nAssim que o pagamento cair, eu te confirmo por aqui!`, {
          etapa_funil: 'aguardando_pagamento',
          valor_estimado: valor,
        })
        logTx(t, 'ia', 'Enviou cobrança PIX', `${at.cliente_nome} · ${brl(valor)}`)
      })
      if (vendaId) notify({ title: 'Cobrança PIX enviada no chat', description: 'Etapa: Aguardando Pagamento.', tone: 'vendas' })
      return vendaId
    },
    [tx, notify],
  )

  const concluirVendaTx = (t: Tx, p: { venda?: VendaPagamento; telefone: string; nome: string; itemNome: string; valor: number; atendimentoId?: string | null }) => {
    const emp = empresaRef.current
    if (p.venda) t.put('vendas_pagamentos', { ...p.venda, status: 'pago' })

    const at = t.db.atendimentos.find((a) => a.id === p.atendimentoId) ?? t.db.atendimentos.find((a) => a.empresa_id === emp && a.cliente_telefone === p.telefone)

    t.db.agendamentos
      .filter((a) => a.empresa_id === emp && a.cliente_telefone === p.telefone && (a.status === 'confirmado' || a.status === 'pendente'))
      .forEach((a) => t.put('agendamentos', { ...a, status: 'concluido', pagamento_status: p.venda?.metodo === 'link_cartao' ? 'pago_cartao' : 'pago_pix' }))

    if (at) {
      const camp = t.db.campanhas_divulgacao.find((c) => c.empresa_id === emp && c.titulo === at.origem_campanha)
      if (camp) t.put('campanhas_divulgacao', { ...camp, vendas_geradas: camp.vendas_geradas + 1 })
      // Base de Conhecimento Viva: sugere a pergunta que antecedeu a venda + a resposta que funcionou
      const msgs = t.db.mensagens.filter((m) => m.atendimento_id === at.id)
      const iPerg = msgs.map((m) => m.remetente === 'cliente' && m.texto.includes('?')).lastIndexOf(true)
      const resp = iPerg >= 0 ? msgs.slice(iPerg + 1).find((m) => m.remetente === 'ia' && !m.texto.startsWith('[Sistema]')) : undefined
      if (iPerg >= 0 && resp && !t.db.base_conhecimento.some((k) => k.empresa_id === emp && k.titulo === msgs[iPerg].texto)) {
        t.put('base_conhecimento', {
          id: uid(),
          empresa_id: emp,
          categoria: 'faq',
          titulo: msgs[iPerg].texto.slice(0, 140),
          conteudo: resp.texto.slice(0, 500),
          origem: 'aprendido',
          status: 'sugerido',
          created_at: nowIso(),
        })
      }
      addMsg(t, at.id, 'ia', `Pagamento de ${brl(p.valor)} confirmado! Muito obrigada, ${p.nome.split(' ')[0]}. Seu atendimento de ${p.itemNome} foi concluído com sucesso.`, {
        etapa_funil: 'concluido',
        status: 'finalizado',
      })
    }

    t.db.pos_venda_automacoes
      .filter((x) => x.empresa_id === emp && x.cliente_telefone === p.telefone && x.tipo_acao === 'lembrete_recompra' && x.status === 'enviado')
      .forEach((x) => t.put('pos_venda_automacoes', { ...x, status: 'recomprou' }))

    const item = t.db.catalogo.find((c) => c.empresa_id === emp && c.nome === p.itemNome)
    const dias = item?.dias_retorno_pos_venda ?? 30
    const hoje = new Date()
    const base = { empresa_id: emp, cliente_nome: p.nome, cliente_telefone: p.telefone, item_comprado: p.itemNome, mensagem_enviada: '', nota_nps: null, status: 'pendente' as const, created_at: nowIso() }
    t.put('pos_venda_automacoes', { ...base, id: uid(), tipo_acao: 'pesquisa_nps', data_programada: isoDate(hoje) })
    t.put('pos_venda_automacoes', { ...base, id: uid(), tipo_acao: 'lembrete_recompra', data_programada: isoDate(addDays(hoje, dias)) })
    upsertClienteTx(t, {
      empresa_id: emp,
      nome: p.nome,
      telefone: p.telefone,
      compra: p.valor,
      tag: 'cliente',
      proxima_acao: `Recompra de ${p.itemNome} em ${addDays(hoje, dias).toLocaleDateString('pt-BR')}`,
    })
    logTx(t, 'sistema', 'Venda concluída', `${p.nome} · ${p.itemNome} · ${brl(p.valor)}`)
    return dias
  }

  const confirmarPagamento = useCallback(
    (vendaId: string) => {
      let dias = 0
      let ok = false
      tx((t) => {
        const venda = t.db.vendas_pagamentos.find((v) => v.id === vendaId)
        if (!venda || venda.status === 'pago') return
        ok = true
        dias = concluirVendaTx(t, { venda, telefone: venda.cliente_telefone, nome: venda.cliente_nome, itemNome: venda.item_nome, valor: venda.valor, atendimentoId: venda.atendimento_id })
        logTx(t, 'usuario', 'Confirmou recebimento PIX', `${venda.cliente_nome} · ${brl(venda.valor)}`)
      })
      if (ok)
        notify({
          title: 'Pagamento confirmado e serviço concluído',
          description: `NPS imediato + recompra em ${dias} dias criados no Pós-Venda.`,
          tone: 'pos',
          action: { label: 'Ver Pós-Venda', onClick: () => goModule('pos_venda') },
        })
      return ok
    },
    [tx, notify, goModule],
  )

  const confirmarPagamentoAtendimento = useCallback(
    (atendimentoId: string) => {
      const venda = [...(dbRef.current?.vendas_pagamentos ?? [])]
        .filter((v) => v.atendimento_id === atendimentoId && v.status === 'pendente')
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
      if (!venda) {
        notify({ title: 'Nenhuma cobrança PIX pendente', description: 'Envie uma cobrança PIX no chat antes de confirmar.', tone: 'erro' })
        return false
      }
      return confirmarPagamento(venda.id)
    },
    [confirmarPagamento, notify],
  )

  const concluirAgendamento = useCallback(
    (agendamentoId: string) => {
      let dias = 0
      tx((t) => {
        const ag = t.db.agendamentos.find((a) => a.id === agendamentoId)
        if (!ag) return
        const venda = t.db.vendas_pagamentos.find((v) => v.empresa_id === ag.empresa_id && v.cliente_telefone === ag.cliente_telefone && v.status === 'pendente')
        if (!venda && ag.pagamento_status === 'pendente') {
          t.put('vendas_pagamentos', {
            id: uid(),
            empresa_id: ag.empresa_id,
            atendimento_id: null,
            cliente_nome: ag.cliente_nome,
            cliente_telefone: ag.cliente_telefone,
            item_nome: ag.servico_nome,
            valor: ag.valor,
            metodo: 'presencial',
            codigo_pix: '',
            status: 'pago',
            created_at: nowIso(),
          })
        }
        t.put('agendamentos', { ...ag, status: 'concluido', pagamento_status: ag.pagamento_status === 'pendente' ? 'pago_pix' : ag.pagamento_status })
        dias = concluirVendaTx(t, { venda, telefone: ag.cliente_telefone, nome: ag.cliente_nome, itemNome: ag.servico_nome, valor: venda?.valor ?? ag.valor, atendimentoId: venda?.atendimento_id })
      })
      notify({
        title: 'Atendimento concluído',
        description: `Cliente enviado ao Pós-Venda (NPS + retorno em ${dias} dias).`,
        tone: 'pos',
        action: { label: 'Ver Pós-Venda', onClick: () => goModule('pos_venda') },
      })
    },
    [tx, notify, goModule],
  )

  // ---------- Automação 3: Pós-Venda -> Inbox ----------
  const dispararReativacao = useCallback(
    (posId: string) => {
      let atendimentoId = ''
      let tipo: PosVendaAutomacao['tipo_acao'] = 'pesquisa_nps'
      let bloqueado = false
      tx((t) => {
        const pos = t.db.pos_venda_automacoes.find((p) => p.id === posId)
        if (!pos) return
        const cli = t.db.clientes_crm.find((c) => c.empresa_id === pos.empresa_id && c.telefone === pos.cliente_telefone)
        if (cli?.opt_out) {
          bloqueado = true
          return
        }
        tipo = pos.tipo_acao
        const cfg = configRef.current
        const primeiro = pos.cliente_nome.split(' ')[0]
        const nina = t.db.funcionarios_ia.find((f) => f.empresa_id === pos.empresa_id && f.funcao === 'pos_venda' && f.ativo)
        const assinatura = nina ? ` — ${nina.nome}, ${nina.titulo_cargo}` : ''
        const item = t.db.catalogo.find((c) => c.empresa_id === pos.empresa_id && c.nome === pos.item_comprado)
        const msg =
          pos.tipo_acao === 'pesquisa_nps' || pos.tipo_acao === 'avaliacao_google'
            ? `${cfg.mensagem_nps.replace('{nome}', primeiro).replace('{item}', pos.item_comprado)}\n\nE se puder, deixe sua avaliação no Google: ${cfg.google_link}${assinatura}`
            : `Oi ${primeiro}! Já faz ${item?.dias_retorno_pos_venda ?? 30} dias desde seu ${pos.item_comprado}. Que tal renovar? Use o cupom ${cfg.cupom_fidelidade} e ganhe ${cfg.desconto_cupom}% OFF${item ? `: de ${brl(item.preco)} por ${brl(precoComDesconto(item.preco, cfg.desconto_cupom))}` : ''}. Quer que eu veja um horário?${assinatura}`
        t.put('pos_venda_automacoes', { ...pos, status: 'enviado', mensagem_enviada: msg })
        atendimentoId = abrirLeadTx(t, { empresa_id: pos.empresa_id, nome: pos.cliente_nome, telefone: pos.cliente_telefone, texto: msg, origem: 'Pós-Venda / Recompra', etapa: 'pos_venda' })
        logTx(t, 'ia', pos.tipo_acao === 'lembrete_recompra' ? 'Enviou convite de recompra' : 'Enviou pesquisa NPS', pos.cliente_nome)
      })
      if (bloqueado) notify({ title: 'Envio bloqueado', description: 'Este cliente pediu para não receber mensagens (opt-out).', tone: 'erro' })
      if (atendimentoId)
        notify({
          title: (tipo as PosVendaAutomacao['tipo_acao']) === 'lembrete_recompra' ? 'Convite de recompra enviado' : 'Pesquisa NPS enviada',
          description: 'A conversa foi reaberta no Inbox na etapa Pós-Venda.',
          tone: 'pos',
          action: { label: 'Abrir no Inbox', onClick: () => abrirNoInbox(atendimentoId) },
        })
      return atendimentoId
    },
    [tx, notify, abrirNoInbox],
  )

  const registrarNps = useCallback(
    (posId: string, nota: number) =>
      tx((t) => {
        const pos = t.db.pos_venda_automacoes.find((p) => p.id === posId)
        if (pos) t.put('pos_venda_automacoes', { ...pos, nota_nps: nota, status: 'respondido' })
      }),
    [tx],
  )

  const testarIA = useCallback(async (funcionarioId: string, texto: string, historico: { remetente: 'cliente' | 'ia'; texto: string }[] = []) => {
    const d = dbRef.current
    if (!d) return ''
    const f = d.funcionarios_ia.find((x) => x.id === funcionarioId)
    const emp = d.empresas.find((e) => e.id === empresaRef.current)!
    const etapa: EtapaFunil = f?.funcao === 'pos_venda' ? 'pos_venda' : 'em_negociacao'
    if (precisaHumano(texto)) return 'Entendi! Vou te passar agora para alguém da nossa equipe, só um instante. (Neste ponto a IA pausa e transfere para um humano.)'
    const ctx = { ...montarContexto(d, null, f, etapa), historico }
    const r = await gerarResposta(ctx, texto, () =>
      responderComoIA({ texto, cliente: 'Cliente Teste', funcionario: f, catalogo: d.catalogo.filter((c) => c.empresa_id === emp.id), agendamentos: d.agendamentos.filter((a) => a.empresa_id === emp.id), empresa: emp, etapa }),
    )
    return r.texto
  }, [])

  // ---------- Playbooks, Marketplace e Base de Conhecimento ----------
  const instalarAgente = useCallback(
    (tpl: NovoAgente) =>
      tx((t) => {
        t.put('funcionarios_ia', { ...tpl, id: uid(), empresa_id: empresaRef.current, ativo: true, created_at: nowIso() })
        logTx(t, 'usuario', 'Instalou agente do Marketplace', `${tpl.nome} · ${tpl.titulo_cargo}`)
      }),
    [tx],
  )

  const aplicarPlaybook = useCallback(
    (playbookId: string) => {
      const pb = PLAYBOOKS.find((p) => p.id === playbookId)
      if (!pb) return
      tx((t) => {
        const eid = empresaRef.current
        pb.agentes.forEach((a) => {
          if (!t.db.funcionarios_ia.some((f) => f.empresa_id === eid && f.nome === a.nome)) t.put('funcionarios_ia', { ...a, id: uid(), empresa_id: eid, ativo: true, created_at: nowIso() })
        })
        pb.catalogo.forEach((c) => {
          if (!t.db.catalogo.some((x) => x.empresa_id === eid && x.nome === c.nome)) t.put('catalogo', { custo_aquisicao: 0, custo_mao_obra: 0, comissao_percentual: null, ...c, id: uid(), empresa_id: eid, ativo: true, created_at: nowIso() })
        })
        pb.conhecimento.forEach((k) => t.put('base_conhecimento', { ...k, id: uid(), empresa_id: eid, origem: 'manual', status: 'ativo', created_at: nowIso() }))
        logTx(t, 'usuario', 'Aplicou playbook', pb.nome)
      })
      notify({ title: `Playbook "${pb.nome}" aplicado`, description: 'Agentes, catálogo e base de conhecimento configurados.', tone: 'ia' })
    },
    [tx, notify],
  )

  // ---------- Meu Site (vitrine pública) ----------
  const slugEmUso = useCallback(async (slug: string, siteId?: string): Promise<boolean> => {
    if (SLUG_RESERVADOS.has(slug)) return true
    if (sessionRef.current.mode === 'conta') {
      const supabase = getSupabase()
      if (supabase) {
        const { data: livre, error } = await supabase.rpc('slug_disponivel', { p_slug: slug, p_site_id: siteId ?? null })
        if (!error) return !livre
      }
    }
    return Boolean(dbRef.current?.sites_vitrine.some((s) => s.slug === slug && s.id !== siteId))
  }, [])

  const verificarSlug = useCallback(
    async (slug: string, siteId?: string): Promise<{ disponivel: boolean; sugestao: string }> => {
      const limpo = slugify(slug)
      if (!(await slugEmUso(limpo, siteId))) return { disponivel: true, sugestao: limpo }
      for (let i = 2; i < 30; i++) {
        const c = `${limpo}-${i}`
        if (!(await slugEmUso(c, siteId))) return { disponivel: false, sugestao: c }
      }
      return { disponivel: false, sugestao: `${limpo}-${Date.now().toString(36)}` }
    },
    [slugEmUso],
  )

  const ativarSite = useCallback(
    async (template: TemplateSite) => {
      const d = dbRef.current
      const emp = d?.empresas.find((e) => e.id === empresaRef.current)
      if (!d || !emp) return
      const local = sugerirSlug(emp.nome, (s) => d.sites_vitrine.some((x) => x.slug === s))
      const { sugestao } = await verificarSlug(local)
      tx((t) => {
        const site = novoSite({ id: uid(), empresa_id: emp.id, nome: emp.nome, segmento: emp.segmento, slug: sugestao, template, agora: nowIso() })
        const wa = t.db.whatsapp_conexoes.find((w) => w.empresa_id === emp.id)?.display_phone_number
        if (wa) site.whatsapp = wa
        t.put('sites_vitrine', site)
        logTx(t, 'usuario', 'Ativou o Meu Site', `Template ${template} · /s/${sugestao}`)
      })
      notify({ title: 'Site criado como rascunho', description: 'Ajuste o conteúdo e clique em Publicar quando estiver pronto.', tone: 'vendas' })
    },
    [tx, notify, verificarSlug],
  )

  const salvarSite = useCallback(
    (site: SiteVitrine, audit = 'Atualizou o Meu Site') =>
      tx((t) => {
        t.put('sites_vitrine', { ...site, slug: slugify(site.slug), updated_at: nowIso() })
        logTx(t, 'usuario', audit, `/s/${site.slug}`)
      }),
    [tx],
  )

  /** Usado pela vitrine no Modo Demonstração (no modo conta, a API pública grava via RPC). */
  const registrarEventoSite = useCallback(
    (empresa_id: string, acao: AcaoSite, origem = 'direto') =>
      tx((t) => t.put('sites_visitas', { id: uid(), empresa_id, acao, origem, created_at: nowIso() })),
    [tx],
  )

  const receberFormularioSite = useCallback(
    (empresa_id: string, f: Pick<SiteFormulario, 'nome' | 'telefone' | 'mensagem' | 'servico_id' | 'data_desejada' | 'horario'>) => {
      tx((t) => {
        const agora = nowIso()
        const servico = t.db.catalogo.find((c) => c.id === f.servico_id)
        t.put('sites_formularios', { ...f, id: uid(), empresa_id, status: 'novo', created_at: agora })
        t.put('sites_visitas', { id: uid(), empresa_id, acao: 'formulario_enviado', origem: 'site', created_at: agora })
        upsertClienteTx(t, { empresa_id, nome: f.nome, telefone: f.telefone, tag: 'site', proxima_acao: servico ? `Retornar sobre ${servico.nome}` : 'Retornar contato do site' })
        const texto = [
          `Olá! Vim pelo site.${servico ? ` Tenho interesse em ${servico.nome}.` : ''}`,
          f.data_desejada ? `Gostaria de agendar para ${f.data_desejada.split('-').reverse().join('/')}${f.horario ? ` às ${f.horario}` : ''}.` : '',
          f.mensagem,
        ]
          .filter(Boolean)
          .join(' ')
        const atual = t.db.atendimentos.find((a) => a.empresa_id === empresa_id && a.cliente_telefone === f.telefone && a.status !== 'finalizado')
        const at: Atendimento = atual
          ? { ...atual, ultima_mensagem: texto, updated_at: agora }
          : {
              id: uid(),
              empresa_id,
              cliente_nome: f.nome,
              cliente_telefone: f.telefone,
              origem_campanha: 'site',
              etapa_funil: 'captado',
              status: 'ia',
              valor_estimado: servico?.preco ?? 0,
              ultima_mensagem: texto,
              updated_at: agora,
            }
        t.put('atendimentos', at)
        t.put('mensagens', { id: uid(), atendimento_id: at.id, remetente: 'cliente', texto, created_at: agora })
        logTx(t, 'sistema', 'Novo lead pelo site', `${f.nome} · ${f.telefone}`, empresa_id)
      })
    },
    [tx],
  )

  const definirStatusEmpresa = useCallback(
    (id: string, status: StatusEmpresa) =>
      tx((t) => {
        const e = t.db.empresas.find((x) => x.id === id)
        if (!e) return
        t.put('empresas', { ...e, status })
        logTx(t, 'usuario', status === 'ativo' ? 'Aprovou empresa' : status === 'suspenso' ? 'Suspendeu empresa' : 'Marcou empresa como pendente', e.nome, id)
      }),
    [tx],
  )

  return {
    ready: Boolean(data && empresa),
    authState,
    db: data,
    allDb: db,
    empresa,
    config,
    session,
    allowedModules,
    syncStatus,
    typing,
    toasts,
    selectedAtendimentoId,
    setSelectedAtendimentoId,
    copilotoAberto,
    setCopilotoAberto,
    finAba,
    setFinAba,
    notify,
    dismiss,
    navigate,
    goModule,
    setRole,
    loginDemo,
    logout,
    signIn,
    signUp,
    recarregar,
    upsert,
    remove,
    updateConfig,
    switchEmpresa,
    resetDemo,
    abrirNoInbox,
    simularLeadCampanha,
    dispararCampanhaSegmento,
    simularMensagemCliente,
    enviarMensagemHumano,
    setEtapa,
    setAtendimentoStatus,
    agendarHorario,
    enviarCobrancaPix,
    confirmarPagamento,
    confirmarPagamentoAtendimento,
    concluirAgendamento,
    dispararReativacao,
    registrarNps,
    testarIA,
    instalarAgente,
    aplicarPlaybook,
    definirStatusEmpresa,
    verificarSlug,
    ativarSite,
    salvarSite,
    registrarEventoSite,
    receberFormularioSite,
  }
}

type Ctx = ReturnType<typeof useAtendeAIState>
const AtendeAIContext = createContext<Ctx | null>(null)

export function AtendeAIProvider({ children }: { children: ReactNode }) {
  const value = useAtendeAIState()
  return <AtendeAIContext.Provider value={value}>{children}</AtendeAIContext.Provider>
}

export function useAtendeAI() {
  const ctx = useContext(AtendeAIContext)
  if (!ctx) throw new Error('useAtendeAI deve ser usado dentro de AtendeAIProvider')
  return ctx
}

export function useData() {
  const ctx = useAtendeAI()
  return { ...ctx, db: ctx.db as DB, empresa: ctx.empresa! }
}

export type { CatalogoItem }
