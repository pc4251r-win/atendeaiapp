'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Check,
  Megaphone,
  MessageCircle,
  QrCode,
  Repeat,
  Star,
  Users,
  Zap,
  KanbanSquare,
  ShieldCheck,
} from 'lucide-react'
import { useAtendeAI } from '@/components/atendeai/provider'
import { Badge, Btn, Card, toneSoft, type Tone } from '@/components/atendeai/ui'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/atendeai/logo'

const STEPS: { tone: Tone; icon: typeof Megaphone; title: string; sub: string }[] = [
  { tone: 'captacao', icon: Megaphone, title: 'Atrai na Divulgação', sub: 'Campanhas com copy de IA e link rastreável' },
  { tone: 'vendas', icon: Bot, title: 'Atende, Agenda e Cobra no PIX', sub: 'Funcionários de IA fecham a venda no WhatsApp' },
  { tone: 'pos', icon: Repeat, title: 'Fideliza no Pós-Venda', sub: 'NPS, avaliação no Google e recompra automática' },
]

function FunnelDemo() {
  const [step, setStep] = useState(0)
  const [auto, setAuto] = useState(true)
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 3800)
    return () => clearInterval(t)
  }, [auto])

  return (
    <Card className="flex flex-col overflow-hidden shadow-2xl">
      <div className="grid grid-cols-3 border-b border-border">
        {STEPS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            onClick={() => {
              setStep(i)
              setAuto(false)
            }}
            className={cn(
              'flex flex-col items-start gap-1 border-b-2 p-3 text-left transition-colors md:p-4',
              step === i ? cn('bg-secondary/50', s.tone === 'captacao' ? 'border-captacao' : s.tone === 'vendas' ? 'border-vendas' : 'border-pos') : 'border-transparent hover:bg-secondary/30',
            )}
          >
            <span className={cn('flex size-7 items-center justify-center rounded-md border [&_svg]:size-4', toneSoft[s.tone])}>
              <s.icon />
            </span>
            <span className="text-xs font-semibold md:text-sm">
              {i + 1}. {s.title}
            </span>
          </button>
        ))}
      </div>
      <div className="min-h-80 bg-background/40 p-5">
        {step === 0 && (
          <div key="s0" className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Campanha: Pele de Verão 20% OFF</span>
              <Badge tone="captacao">Instagram Ads</Badge>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
              Sua pele pronta para o verão! Limpeza de Pele Profunda de R$ 180 por <span className="font-semibold text-foreground">R$ 144</span>. Toque e fale com a Luna no WhatsApp.
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Cliques', '412'],
                ['Leads', '58'],
                ['Vendas', '17'],
              ].map(([l, v]) => (
                <div key={l} className="rounded-lg border border-border bg-card p-3">
                  <p className="text-xs text-muted-foreground">{l}</p>
                  <p className="text-lg font-semibold text-captacao">{v}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-xs text-muted-foreground">atendeai360.app/c/pele-verao</p>
          </div>
        )}
        {step === 1 && (
          <div key="s1" className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-2">
            <div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm border border-ia/30 bg-ia/10 px-3 py-2 text-sm">Oi Mariana! Tenho amanhã às 15:00 livre para sua Limpeza de Pele. Reservo?</div>
            <div className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-secondary px-3 py-2 text-sm">Sim! Pode mandar o PIX</div>
            <div className="flex max-w-[85%] items-center gap-3 self-start rounded-2xl rounded-bl-sm border border-vendas/30 bg-vendas/10 px-3 py-2 text-sm">
              <QrCode className="size-10 text-vendas" aria-hidden />
              <div className="flex flex-col">
                <span className="font-semibold">PIX Copia e Cola · R$ 144,00</span>
                <span className="font-mono text-xs text-muted-foreground">00020126...6304A1F3</span>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 self-center rounded-full border border-vendas/30 bg-vendas/10 px-3 py-1 text-xs text-vendas">
              <Check className="size-3.5" /> Pagamento confirmado · Agendado 15:00
            </div>
          </div>
        )}
        {step === 2 && (
          <div key="s2" className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-2">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-pos/10 text-lg font-bold text-pos">10</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Mariana respondeu a pesquisa NPS</span>
                <span className="text-xs text-muted-foreground">Link do Google enviado automaticamente</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-pos">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-5 fill-current" />
              ))}
              <span className="ml-2 text-sm text-muted-foreground">Avaliação publicada no Google</span>
            </div>
            <div className="rounded-lg border border-pos/30 bg-pos/10 p-4 text-sm leading-relaxed">
              Em 30 dias: “Oi Mariana! Hora de renovar sua Limpeza de Pele. Use o cupom <span className="font-mono font-semibold">VOLTEI15</span> e ganhe 15% OFF.”
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

const FEATURES = [
  { icon: Megaphone, tone: 'captacao' as Tone, title: 'Criador de Campanhas com IA', text: 'Gere copies para Instagram, Status e Lista do WhatsApp com link rastreável e página de captura.' },
  { icon: Bot, tone: 'ia' as Tone, title: 'Funcionários de IA treináveis', text: 'SDR, Closer, Secretária e Customer Success que respondem com seus preços e horários reais.' },
  { icon: KanbanSquare, tone: 'captacao' as Tone, title: 'Inbox + CRM Kanban', text: 'Todas as conversas em um só lugar, com transbordo humano e funil visual de vendas.' },
  { icon: CalendarCheck, tone: 'vendas' as Tone, title: 'Agenda Inteligente', text: 'A IA consulta horários livres e confirma o agendamento direto na conversa.' },
  { icon: QrCode, tone: 'vendas' as Tone, title: 'Cobrança PIX no chat', text: 'PIX Copia e Cola com QR Code gerado na hora, no padrão oficial do Banco Central.' },
  { icon: Repeat, tone: 'pos' as Tone, title: 'Pós-Venda e Recompra', text: 'Régua automática de NPS, avaliação no Google e lembrete de retorno com cupom.' },
]

const PLANS = [
  { name: 'Starter', price: 97, desc: 'Para começar a vender no automático', items: ['2 Funcionários de IA', '2.000 mensagens IA/mês', 'Inbox + Kanban', 'Cobrança PIX'], featured: false },
  { name: 'Pro', price: 197, desc: 'Para negócios em crescimento', items: ['5 Funcionários de IA', '8.000 mensagens IA/mês', 'Campanhas com IA', 'Agenda Inteligente', 'Equipe com 5 atendentes'], featured: true },
  { name: 'Full 360', price: 397, desc: 'O ciclo completo de vendas', items: ['10 Funcionários de IA', '20.000 mensagens IA/mês', 'Pós-Venda, NPS e Recompra', 'Cloud API Oficial', 'Atendentes ilimitados'], featured: false },
]

const FAQ = [
  ['Preciso de conhecimento técnico?', 'Não. Você conecta o WhatsApp lendo um QR Code, cadastra seus serviços e os Funcionários de IA já começam a atender.'],
  ['A IA usa meus preços reais?', 'Sim. As respostas consultam o seu Catálogo de Ofertas e a disponibilidade da Agenda em tempo real.'],
  ['Como funciona o PIX?', 'Geramos o código PIX Copia e Cola e o QR Code no padrão do Banco Central usando a sua chave. O dinheiro cai direto na sua conta.'],
  ['Posso assumir a conversa?', 'A qualquer momento. Com um clique você assume o atendimento humano e devolve para a IA quando quiser.'],
  ['Funciona com a API oficial do WhatsApp?', 'Sim. Você escolhe entre Evolution API (QR Code, sem custo de mensagens) e a Cloud API Oficial da Meta.'],
]

export function LandingPage() {
  const { navigate, loginDemo } = useAtendeAI()

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Seções">
            <a href="#funil" className="hover:text-foreground">Funil 360º</a>
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => navigate('login')}>Entrar</Btn>
            <Btn size="sm" onClick={() => navigate('cadastro')}>Começar Agora</Btn>
          </div>
        </div>
      </header>

      <main>
        <section id="funil" className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <Badge tone="vendas" className="self-start">
              <Zap className="size-3" /> Ciclo completo de vendas no WhatsApp
            </Badge>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Sua equipe de IA que <span className="text-captacao">atrai</span>, <span className="text-vendas">vende no PIX</span> e{' '}
              <span className="text-pos">traz o cliente de volta</span>.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              O AtendeAI 360 conecta divulgação, atendimento, agenda, cobrança e pós-venda em um único funil automatizado. Cada etapa alimenta a próxima, sem planilhas.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Btn size="lg" onClick={() => navigate('cadastro')}>
                Começar Agora <ArrowRight />
              </Btn>
              <Btn size="lg" variant="outline" onClick={loginDemo}>
                Testar Demonstração Ao Vivo
              </Btn>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {['Sem cartão de crédito', 'Configuração em 5 minutos', 'PIX direto na sua conta'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-vendas" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <FunnelDemo />
        </section>

        <section className="border-y border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2 md:items-center">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-vendas">Comparativo de economia</span>
              <h2 className="text-balance text-3xl font-semibold tracking-tight">Uma equipe completa pelo preço de uma assinatura</h2>
              <p className="text-pretty leading-relaxed text-muted-foreground">
                Atendimento 24/7, resposta em segundos e nenhuma venda perdida fora do horário comercial.
              </p>
            </div>
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-4 font-medium">Função</th>
                    <th className="p-4 font-medium">Equipe tradicional</th>
                    <th className="p-4 font-medium text-vendas">AtendeAI 360</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Social media / tráfego', 'R$ 2.500', 'Incluso'],
                    ['Atendente / SDR', 'R$ 2.200', 'Incluso'],
                    ['Secretária de agenda', 'R$ 1.900', 'Incluso'],
                    ['Pós-venda / CS', 'R$ 2.000', 'Incluso'],
                  ].map(([f, a, b]) => (
                    <tr key={f} className="border-b border-border last:border-0">
                      <td className="p-4">{f}</td>
                      <td className="p-4 text-muted-foreground line-through">{a}</td>
                      <td className="p-4 text-vendas">{b}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/40 font-semibold">
                    <td className="p-4">Total mensal</td>
                    <td className="p-4">R$ 8.600</td>
                    <td className="p-4 text-vendas">a partir de R$ 97</td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-10 flex max-w-2xl flex-col gap-3">
            <span className="font-mono text-xs uppercase tracking-widest text-ia">Recursos</span>
            <h2 className="text-balance text-3xl font-semibold tracking-tight">Tudo o que acontece entre o anúncio e a recompra</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="flex flex-col gap-3 p-6">
                <span className={cn('flex size-10 items-center justify-center rounded-lg border [&_svg]:size-5', toneSoft[f.tone])}>
                  <f.icon />
                </span>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="planos" className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <span className="font-mono text-xs uppercase tracking-widest text-vendas">Planos</span>
              <h2 className="text-balance text-3xl font-semibold tracking-tight">Escolha o tamanho do seu funil</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <Card key={p.name} className={cn('relative flex flex-col gap-5 p-6', p.featured && 'border-vendas')}>
                  {p.featured && <Badge tone="vendas" className="absolute -top-3 left-6 bg-card">Mais escolhido</Badge>}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">R$ {p.price}</span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </p>
                  <ul className="flex flex-1 flex-col gap-2 text-sm">
                    {p.items.map((i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="size-4 text-vendas" /> {i}
                      </li>
                    ))}
                  </ul>
                  <Btn variant={p.featured ? 'solid' : 'outline'} onClick={() => navigate('cadastro')}>Começar Agora</Btn>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-16 md:py-24">
          <h2 className="mb-8 text-balance text-center text-3xl font-semibold tracking-tight">Perguntas frequentes</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-xl border border-border bg-card p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20">
          <Card className="flex flex-col items-center gap-6 p-10 text-center">
            <div className="flex items-center gap-3 text-muted-foreground">
              <MessageCircle className="size-5 text-vendas" />
              <Users className="size-5 text-captacao" />
              <ShieldCheck className="size-5 text-pos" />
            </div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight">Veja o funil inteiro funcionando agora</h2>
            <p className="max-w-xl text-pretty text-muted-foreground">Entre no painel em modo demonstração, simule um lead vindo do anúncio e acompanhe até a recompra.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Btn size="lg" onClick={loginDemo}>Testar Demonstração Ao Vivo</Btn>
              <Btn size="lg" variant="outline" onClick={() => navigate('cadastro')}>Criar minha conta</Btn>
            </div>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} AtendeAI 360. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
