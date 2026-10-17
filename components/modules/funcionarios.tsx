'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Download, FlaskConical, Pencil, Plus, Send, Sparkles, Store, Target, Trash2 } from 'lucide-react'
import { MARKETPLACE_AGENTES, playbookPara } from '@/lib/playbooks'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Empty, Field, Input, Modal, PageHeader, Select, Switch, Textarea } from '@/components/atendeai/ui'
import { FUNCOES, nowIso, TONS, uid } from '@/lib/format'
import type { FuncionarioIA } from '@/lib/types'
import { cn } from '@/lib/utils'

function Marketplace({ atingiuLimite }: { atingiuLimite: boolean }) {
  const { empresa, instalarAgente, aplicarPlaybook, notify } = useData()
  const sugerido = playbookPara(empresa.segmento)
  return (
    <section aria-labelledby="mkt" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="mkt" className="flex items-center gap-2 text-lg font-semibold">
          <Store className="size-5 text-ia" /> Marketplace de Agentes
        </h2>
        <p className="text-sm text-muted-foreground">Agentes prontos, treinados por nicho. Instale com um clique e ajuste depois.</p>
      </div>

      <Card className="flex flex-col gap-3 border-ia/30 p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-ia" /> Playbook recomendado: {sugerido.nome}
          </span>
          <span className="text-sm leading-relaxed text-muted-foreground">
            {sugerido.descricao} Inclui {sugerido.agentes.length} agentes, {sugerido.catalogo.length} itens de catálogo e {sugerido.conhecimento.length} regras de conhecimento.
          </span>
        </div>
        <Btn
          tone="ia"
          onClick={() => {
            aplicarPlaybook(sugerido.id)
            notify({ title: `Playbook ${sugerido.nome} aplicado`, tone: 'ia' })
          }}
        >
          Aplicar playbook
        </Btn>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MARKETPLACE_AGENTES.map((a) => (
          <Card key={`${a.destaque}-${a.nome}`} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium">{a.nome}</span>
                <span className="text-xs text-muted-foreground">{a.titulo_cargo}</span>
              </div>
              <Badge tone="ia">{a.destaque}</Badge>
            </div>
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{a.meta_principal || a.instrucoes_especificas}</p>
            <Btn
              size="sm"
              variant="outline"
              className="mt-auto self-start"
              disabled={atingiuLimite}
              onClick={() => {
                const { destaque: _d, ...tpl } = a
                instalarAgente(tpl)
                notify({ title: `${a.nome} instalado`, tone: 'ia' })
              }}
            >
              <Download /> Instalar
            </Btn>
          </Card>
        ))}
      </div>
    </section>
  )
}

const blank = (empresaId: string): FuncionarioIA => ({
  id: '',
  empresa_id: empresaId,
  nome: '',
  funcao: 'vendas',
  titulo_cargo: '',
  tom_voz: 'informal',
  instrucoes_especificas: '',
  meta_principal: '',
  permissoes: ['agendar', 'enviar_pix', 'transferir_humano'],
  ativo: true,
  created_at: '',
})

function TrainChat({ f }: { f: FuncionarioIA }) {
  const { testarIA } = useData()
  const [msgs, setMsgs] = useState<{ from: 'eu' | 'ia'; text: string }[]>([
    { from: 'ia', text: `Oi! Sou ${f.nome}, ${f.titulo_cargo}. Me pergunte sobre preços, horários ou pagamento para testar meu treinamento.` },
  ])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [msgs, typing])

  async function send(t: string) {
    const v = t.trim()
    if (!v || typing) return
    const historico = msgs.slice(1).map((m) => ({ remetente: m.from === 'eu' ? ('cliente' as const) : ('ia' as const), texto: m.text }))
    setMsgs((m) => [...m, { from: 'eu', text: v }])
    setText('')
    setTyping(true)
    const resposta = await testarIA(f.id, v, historico)
    setTyping(false)
    setMsgs((m) => [...m, { from: 'ia', text: resposta }])
  }

  return (
    <div className="flex h-[60vh] flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {['Quanto custa?', 'Tem horário amanhã?', 'Aceita PIX?', 'Achei caro', 'Nota 10!'].map((s) => (
          <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-ia/30 bg-ia/10 px-3 py-1 text-xs text-ia hover:bg-ia/20">
            {s}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-background p-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed', m.from === 'ia' ? 'self-start rounded-bl-sm border border-ia/30 bg-ia/15' : 'self-end rounded-br-sm bg-secondary')}>
            {m.text}
          </div>
        ))}
        {typing && <span className="self-start text-xs text-ia">{f.nome} está digitando...</span>}
        <div ref={endRef} />
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          send(text)
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
          }}
          placeholder="Escreva como se fosse um cliente..."
          aria-label="Mensagem de teste"
        />
        <Btn type="submit" tone="ia" aria-label="Enviar">
          <Send />
        </Btn>
      </form>
    </div>
  )
}

export function Funcionarios() {
  const { db, empresa, upsert, remove, notify } = useData()
  const [edit, setEdit] = useState<FuncionarioIA | null>(null)
  const [test, setTest] = useState<FuncionarioIA | null>(null)
  const lista = db.funcionarios_ia
  const atingiuLimite = lista.length >= empresa.limite_funcionarios

  function salvar() {
    if (!edit || !edit.nome) return
    upsert('funcionarios_ia', { ...edit, id: edit.id || uid(), created_at: edit.created_at || nowIso() })
    notify({ title: edit.id ? 'Funcionário de IA atualizado' : 'Funcionário de IA contratado', description: edit.nome, tone: 'ia' })
    setEdit(null)
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Equipe de IA"
        tone="ia"
        title="Funcionários de IA"
        description={`Agentes especializados por função que respondem com seus preços e horários reais. ${lista.length}/${empresa.limite_funcionarios} do seu plano.`}
        actions={
          <Btn tone="ia" onClick={() => setEdit(blank(empresa.id))} disabled={atingiuLimite}>
            <Plus /> Novo Funcionário de IA
          </Btn>
        }
      />
      {lista.length === 0 ? (
        <Card>
          <Empty icon={<Bot />} title="Nenhum Funcionário de IA" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((f) => (
            <Card key={f.id} className={cn('flex flex-col gap-4 p-5', !f.ativo && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl border border-ia/30 bg-ia/10 text-ia">
                    <Bot className="size-5" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold">{f.nome}</span>
                    <span className="text-xs text-muted-foreground">{f.titulo_cargo}</span>
                  </div>
                </div>
                <Switch checked={f.ativo} onChange={(v) => upsert('funcionarios_ia', { ...f, ativo: v })} label={`Ativar ${f.nome}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="ia">{FUNCOES.find((x) => x.key === f.funcao)?.label}</Badge>
                <Badge>{TONS.find((x) => x.key === f.tom_voz)?.label}</Badge>
              </div>
              <p className="flex items-start gap-2 text-sm">
                <Target className="mt-0.5 size-4 shrink-0 text-ia" /> {f.meta_principal}
              </p>
              <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{f.instrucoes_especificas}</p>
              <div className="mt-auto flex gap-2">
                <Btn tone="ia" size="sm" className="flex-1" onClick={() => setTest(f)}>
                  <FlaskConical /> Testar e Treinar IA
                </Btn>
                <Btn variant="outline" size="sm" onClick={() => setEdit(f)} aria-label="Editar">
                  <Pencil />
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => remove('funcionarios_ia', f.id)} aria-label="Excluir">
                  <Trash2 />
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Marketplace atingiuLimite={atingiuLimite} />

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Editar Funcionário de IA' : 'Novo Funcionário de IA'} size="lg">
        {edit && (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              salvar()
            }}
          >
            <Field label="Nome do agente">
              <Input required value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex: Luna" />
            </Field>
            <Field label="Título do cargo">
              <Input value={edit.titulo_cargo} onChange={(e) => setEdit({ ...edit, titulo_cargo: e.target.value })} placeholder="Ex: Closer de Vendas" />
            </Field>
            <Field label="Função">
              <Select value={edit.funcao} onChange={(e) => setEdit({ ...edit, funcao: e.target.value as FuncionarioIA['funcao'] })}>
                {FUNCOES.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tom de voz">
              <Select value={edit.tom_voz} onChange={(e) => setEdit({ ...edit, tom_voz: e.target.value as FuncionarioIA['tom_voz'] })}>
                {TONS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Meta principal">
                <Input value={edit.meta_principal} onChange={(e) => setEdit({ ...edit, meta_principal: e.target.value })} placeholder="Ex: Fechar venda com pagamento PIX" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Instruções do sistema">
                <Textarea value={edit.instrucoes_especificas} onChange={(e) => setEdit({ ...edit, instrucoes_especificas: e.target.value })} placeholder="Como o agente deve se comportar, o que nunca dizer, quando transferir para humano..." />
              </Field>
            </div>
            <Btn type="submit" tone="ia" className="sm:col-span-2">
              Salvar Funcionário de IA
            </Btn>
          </form>
        )}
      </Modal>

      <Modal open={!!test} onClose={() => setTest(null)} title={`Testar e Treinar: ${test?.nome ?? ''}`} description="Respostas usam os preços reais do Catálogo e a disponibilidade da Agenda.">
        {test && <TrainChat key={test.id} f={test} />}
      </Modal>
    </div>
  )
}
