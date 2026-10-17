'use client'

import { useState } from 'react'
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Contact,
  Crown,
  Database,
  Globe,
  HardDrive,
  Inbox,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Plug,
  QrCode,
  Radar,
  Repeat,
  ScrollText,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Empty, Select, type Tone } from '@/components/atendeai/ui'
import { Logo } from '@/components/atendeai/logo'
import { cn } from '@/lib/utils'
import type { ModuleKey, Role } from '@/lib/types'
import { initials, PLANO_LABEL } from '@/lib/format'
import { Dashboard } from '@/components/modules/dashboard'
import { Divulgacao } from '@/components/modules/divulgacao'
import { InboxModule } from '@/components/modules/inbox'
import { Agenda } from '@/components/modules/agenda'
import { Vendas } from '@/components/modules/vendas'
import { PosVenda } from '@/components/modules/pos-venda'
import { Funcionarios } from '@/components/modules/funcionarios'
import { Catalogo } from '@/components/modules/catalogo'
import { Whatsapp } from '@/components/modules/whatsapp'
import { Equipe } from '@/components/modules/equipe'
import { Master } from '@/components/modules/master'
import { Crm } from '@/components/modules/crm'
import { RadarModule } from '@/components/modules/radar'
import { Conhecimento } from '@/components/modules/conhecimento'
import { Integracoes } from '@/components/modules/integracoes'
import { AuditoriaModule } from '@/components/modules/auditoria'
import { MeuSite } from '@/components/modules/meu-site'
import { Copiloto } from '@/components/app/copiloto'

const NAV: { key: ModuleKey; label: string; icon: typeof BarChart3; tone: Tone; group?: string }[] = [
  { key: 'dashboard', label: 'Visão Geral 360º', icon: BarChart3, tone: 'vendas', group: 'Comando' },
  { key: 'radar', label: 'Radar de Oportunidades', icon: Radar, tone: 'pos' },
  { key: 'divulgacao', label: '1. Divulgação & Captação', icon: Megaphone, tone: 'captacao', group: 'Funil' },
  { key: 'inbox', label: '2. Inbox & Atendimento IA', icon: Inbox, tone: 'ia' },
  { key: 'agenda', label: '3. Agenda Inteligente', icon: CalendarDays, tone: 'captacao' },
  { key: 'vendas', label: '4. Vendas & Cobrança PIX', icon: QrCode, tone: 'vendas' },
  { key: 'pos_venda', label: '5. Pós-Venda & Retenção', icon: Repeat, tone: 'pos' },
  { key: 'crm', label: 'CRM de Clientes', icon: Contact, tone: 'captacao' },
  { key: 'funcionarios', label: 'Funcionários de IA', icon: Bot, tone: 'ia', group: 'Inteligência' },
  { key: 'conhecimento', label: 'Base de Conhecimento', icon: BookOpen, tone: 'ia' },
  { key: 'catalogo', label: 'Catálogo de Ofertas', icon: ShoppingBag, tone: 'vendas' },
  { key: 'whatsapp', label: 'Conexão WhatsApp', icon: Smartphone, tone: 'vendas', group: 'Configuração' },
  { key: 'meu_site', label: 'Meu Site', icon: Globe, tone: 'captacao' },
  { key: 'integracoes', label: 'Integrações', icon: Plug, tone: 'captacao' },
  { key: 'equipe', label: 'Equipe & Acessos', icon: Users, tone: 'captacao' },
  { key: 'auditoria', label: 'Auditoria', icon: ScrollText, tone: 'neutral' },
  { key: 'master', label: 'Painel Super Admin', icon: Crown, tone: 'pos', group: 'Plataforma' },
]

const activeTone: Record<Tone, string> = {
  captacao: 'bg-captacao/10 text-captacao',
  ia: 'bg-ia/10 text-ia',
  vendas: 'bg-vendas/10 text-vendas',
  pos: 'bg-pos/10 text-pos',
  neutral: 'bg-secondary text-foreground',
  erro: 'bg-destructive/10 text-destructive',
}

const MODULES: Record<ModuleKey, () => React.ReactNode> = {
  dashboard: () => <Dashboard />,
  radar: () => <RadarModule />,
  divulgacao: () => <Divulgacao />,
  inbox: () => <InboxModule />,
  agenda: () => <Agenda />,
  vendas: () => <Vendas />,
  pos_venda: () => <PosVenda />,
  crm: () => <Crm />,
  funcionarios: () => <Funcionarios />,
  conhecimento: () => <Conhecimento />,
  catalogo: () => <Catalogo />,
  whatsapp: () => <Whatsapp />,
  meu_site: () => <MeuSite />,
  integracoes: () => <Integracoes />,
  equipe: () => <Equipe />,
  auditoria: () => <AuditoriaModule />,
  master: () => <Master />,
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session, goModule, db, empresa, allowedModules } = useData()
  const humanos = db.atendimentos.filter((a) => a.status === 'humano').length
  const abertos = db.atendimentos.filter((a) => a.status !== 'finalizado').length
  const pendentesPos = db.pos_venda_automacoes.filter((p) => p.status === 'pendente').length
  const sugestoes = db.base_conhecimento.filter((k) => k.status === 'sugerido').length
  const nav = NAV.filter((n) => n.key !== 'master' || session.role === 'super_admin')

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between px-2 pt-1">
        <Logo />
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="truncate text-sm font-medium">{empresa.nome}</p>
        <p className="text-xs text-muted-foreground">Plano {PLANO_LABEL[empresa.plano]}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto" aria-label="Módulos">
        {nav.map((item) => {
          const locked = !allowedModules.includes(item.key)
          const active = session.module === item.key
          return (
            <div key={item.key} className="flex flex-col">
              {item.group && <span className="mb-1 mt-3 px-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground first:mt-0">{item.group}</span>}
              <button
                type="button"
                onClick={() => {
                  goModule(item.key)
                  onNavigate?.()
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active ? activeTone[item.tone] : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  locked && 'opacity-50',
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {locked && <Lock className="size-3.5" aria-label="Sem acesso" />}
                {!locked && item.key === 'inbox' && abertos > 0 && (
                  <span className={cn('rounded-full px-1.5 text-[11px] font-semibold', humanos ? 'bg-destructive text-foreground' : 'bg-ia text-foreground')}>{humanos || abertos}</span>
                )}
                {!locked && item.key === 'pos_venda' && pendentesPos > 0 && <span className="rounded-full bg-pos px-1.5 text-[11px] font-semibold text-on-accent">{pendentesPos}</span>}
                {!locked && item.key === 'conhecimento' && sugestoes > 0 && <span className="rounded-full bg-ia px-1.5 text-[11px] font-semibold text-foreground">{sugestoes}</span>}
              </button>
            </div>
          )
        })}
      </nav>
    </div>
  )
}

export function AppShell() {
  const { session, syncStatus, setRole, logout, allowedModules, setCopilotoAberto, copilotoAberto } = useData()
  const [mobileOpen, setMobileOpen] = useState(false)
  const allowed = allowedModules.includes(session.module)

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r border-border bg-card lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-background/80" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-card animate-in slide-in-from-left">
            <button type="button" aria-label="Fechar menu" className="absolute right-3 top-4 rounded-md p-1 text-muted-foreground hover:bg-secondary" onClick={() => setMobileOpen(false)}>
              <X className="size-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
              <Menu className="size-5" />
            </button>
            {session.mode === 'demo' ? (
              <Badge tone="ia">
                <HardDrive className="size-3" /> Modo Demonstração
              </Badge>
            ) : syncStatus === 'conectado' ? (
              <Badge tone="vendas">
                <Database className="size-3" /> Supabase conectado
              </Badge>
            ) : syncStatus === 'sincronizando' ? (
              <Badge tone="captacao">
                <Database className="size-3 animate-pulse" /> Sincronizando...
              </Badge>
            ) : (
              <Badge tone="erro">
                <Database className="size-3" /> Erro de sincronização
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn size="sm" tone="ia" onClick={() => setCopilotoAberto(!copilotoAberto)} aria-expanded={copilotoAberto}>
              <Sparkles /> <span className="hidden sm:inline">Copiloto</span>
            </Btn>
            {session.mode === 'demo' && (
              <>
                <label className="sr-only" htmlFor="perfil-rapido">
                  Perfil de acesso (demonstração)
                </label>
                <Select id="perfil-rapido" value={session.role} onChange={(e) => setRole(e.target.value as Role)} className="hidden h-9 w-auto md:block">
                  <option value="empresa">Perfil: Admin</option>
                  <option value="funcionario">Perfil: Atendente</option>
                  <option value="super_admin">Perfil: Super Admin</option>
                </Select>
              </>
            )}
            <span className="hidden size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold md:flex" title={`${session.userName} · ${session.userEmail}`}>
              {initials(session.userName)}
            </span>
            <Btn variant="ghost" size="sm" onClick={logout} aria-label="Sair">
              <LogOut /> <span className="hidden md:inline">Sair</span>
            </Btn>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          {allowed ? (
            MODULES[session.module]()
          ) : (
            <Empty icon={<Lock />} title="Acesso restrito" description="Seu perfil não tem permissão para este módulo. Peça acesso ao administrador da empresa." />
          )}
        </main>
      </div>
      <Copiloto />
    </div>
  )
}
