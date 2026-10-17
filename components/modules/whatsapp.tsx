'use client'

import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Cloud, Loader2, PlugZap, QrCode, RefreshCw, Save, ShieldCheck, Smartphone, Unplug } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, Field, Input, PageHeader, Switch } from '@/components/atendeai/ui'
import { nowIso, uid } from '@/lib/format'
import type { WhatsappConexao } from '@/lib/types'
import { cn } from '@/lib/utils'

type Resp = { simulado?: boolean; motivo?: string; qr?: string; status?: WhatsappConexao['status']; error?: string }

async function chamar(acao: 'conectar' | 'status' | 'desconectar'): Promise<Resp> {
  try {
    const r = await fetch(`/api/whatsapp/${acao}`, { method: 'POST' })
    return (await r.json()) as Resp
  } catch {
    return { error: 'Sem conexão com o servidor' }
  }
}

export function Whatsapp() {
  const { db, empresa, upsert, notify, session } = useData()

  // 🔧 Normaliza o registro vindo do banco: qr_code_base64 pode vir null do Supabase
  const registroBanco = db.whatsapp_conexoes[0]
  const atual: WhatsappConexao = registroBanco
    ? { ...registroBanco, qr_code_base64: registroBanco.qr_code_base64 || '' }
    : {
        id: uid(),
        empresa_id: empresa.id,
        api_provider: 'evolution_api',
        instance_name: `atd-${empresa.id.slice(0, 8)}`,
        display_phone_number: '',
        status: 'desconectado',
        qr_code_base64: '',
        auto_resposta_ia: true,
        updated_at: nowIso(),
      }

  const [form, setForm] = useState(atual)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [simulado, setSimulado] = useState(session.mode === 'demo')

  useEffect(() => setForm(atual), [atual.status, atual.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (atual.status !== 'qr_pendente') return
    setCountdown(45)
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(t)
  }, [atual.status, atual.qr_code_base64])

  // Com Evolution real, consulta o estado a cada 4s enquanto o QR estiver na tela
  useEffect(() => {
    if (simulado || atual.status !== 'qr_pendente') return
    const t = setInterval(async () => {
      const r = await chamar('status')
      if (r.status && r.status !== atual.status) {
        upsert('whatsapp_conexoes', { ...atual, status: r.status, qr_code_base64: r.status === 'conectado' ? '' : atual.qr_code_base64, updated_at: nowIso() })
        if (r.status === 'conectado') notify({ title: 'WhatsApp conectado', tone: 'vendas' })
      }
    }, 4000)
    return () => clearInterval(t)
  }, [simulado, atual, upsert, notify])

  const save = (patch: Partial<WhatsappConexao>) => upsert('whatsapp_conexoes', { ...form, ...patch, updated_at: nowIso() })

  async function gerarQr() {
    setLoading(true)
    const r = await chamar('conectar')
    setLoading(false)
    if (r.error) return notify({ title: 'Não foi possível gerar o QR', description: r.error, tone: 'erro' })
    if (r.simulado) {
      setSimulado(true)
      save({ status: 'qr_pendente', qr_code_base64: `2@${uid().replace(/-/g, '')},${form.instance_name.toUpperCase()},${Date.now()}` })
      return
    }
    setSimulado(false)
    save({ status: 'qr_pendente', qr_code_base64: r.qr ?? '' })
  }

  function simularLeitura() {
    save({ status: 'conectado', qr_code_base64: '', display_phone_number: form.display_phone_number || '+55 11 99999-0000' })
    notify({ title: 'WhatsApp conectado (simulação)', description: 'Em produção, a confirmação vem da Evolution API.', tone: 'vendas' })
  }

  async function desconectarTudo() {
    if (!simulado) await chamar('desconectar')
    save({ status: 'desconectado', qr_code_base64: '' })
  }

  // 🔧 CORREÇÃO PRINCIPAL: nunca chama startsWith em null/undefined
  const qrCode = atual.qr_code_base64 || ''
  const qrImagem = qrCode.startsWith('data:image')

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader eyebrow="Canal" title="Conexão WhatsApp" description="Conecte seu número via Evolution API (QR Code) ou pela Cloud API Oficial da Meta." />

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { k: 'evolution_api' as const, icon: QrCode, title: 'Evolution API', desc: 'Pareamento por QR Code, sem custo por mensagem.' },
          { k: 'cloud_api' as const, icon: Cloud, title: 'Cloud API Oficial', desc: 'API oficial da Meta com selo verificado e templates.' },
        ].map((p) => (
          <button
            key={p.k}
            type="button"
            onClick={() => setForm({ ...form, api_provider: p.k })}
            className={cn('flex items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors', form.api_provider === p.k ? 'border-vendas' : 'border-border hover:border-muted-foreground')}
            aria-pressed={form.api_provider === p.k}
          >
            <span className={cn('flex size-10 items-center justify-center rounded-lg border', form.api_provider === p.k ? 'border-vendas/30 bg-vendas/10 text-vendas' : 'border-border text-muted-foreground')}>
              <p.icon className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{p.title}</span>
              <span className="text-sm text-muted-foreground">{p.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="font-medium">Instância</h2>
          <div className="flex gap-3 rounded-lg border border-vendas/30 bg-vendas/5 p-3 text-sm leading-relaxed">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-vendas" />
            <p className="text-muted-foreground">
              URL e API Key da Evolution ficam só no servidor (<code className="font-mono text-xs">EVOLUTION_API_URL</code> e <code className="font-mono text-xs">EVOLUTION_API_KEY</code>) e nunca chegam ao navegador.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={form.api_provider === 'evolution_api' ? 'Nome da instância' : 'Phone Number ID'}>
              <Input value={form.instance_name} onChange={(e) => setForm({ ...form, instance_name: e.target.value.replace(/[^a-zA-Z0-9-_]/g, '') })} />
            </Field>
            <Field label="Número exibido">
              <Input value={form.display_phone_number} onChange={(e) => setForm({ ...form, display_phone_number: e.target.value })} placeholder="+55 11 99999-0000" />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Auto-Resposta da IA</span>
              <span className="text-xs text-muted-foreground">Funcionários de IA respondem automaticamente as novas mensagens.</span>
            </div>
            <Switch
              checked={form.auto_resposta_ia}
              onChange={(v) => {
                setForm({ ...form, auto_resposta_ia: v })
                save({ auto_resposta_ia: v })
              }}
              label="Auto-Resposta da IA"
            />
          </div>
          <Btn
            variant="outline"
            className="self-start"
            onClick={() => {
              save({})
              notify({ title: 'Configuração salva', tone: 'vendas' })
            }}
          >
            <Save /> Salvar
          </Btn>
        </Card>

        <Card className="flex flex-col items-center gap-4 p-5 text-center">
          <div className="flex w-full items-center justify-between">
            <h2 className="font-medium">Status da instância</h2>
            <div className="flex gap-1.5">
              {simulado && <Badge tone="ia">Simulação</Badge>}
              <Badge tone={atual.status === 'conectado' ? 'vendas' : atual.status === 'qr_pendente' ? 'pos' : 'erro'}>
                {atual.status === 'conectado' ? 'Conectado' : atual.status === 'qr_pendente' ? 'QR pendente' : 'Desconectado'}
              </Badge>
            </div>
          </div>

          {atual.status === 'conectado' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
              <span className="flex size-16 items-center justify-center rounded-full bg-vendas/10 text-vendas">
                <CheckCircle2 className="size-8" />
              </span>
              <p className="font-semibold">{atual.display_phone_number || 'Número conectado'}</p>
              <p className="text-sm text-muted-foreground">
                {atual.api_provider === 'evolution_api' ? 'Evolution API' : 'Cloud API'} · instância {atual.instance_name || '—'}
              </p>
              <Btn variant="outline" tone="erro" onClick={desconectarTudo}>
                <Unplug /> Desconectar
              </Btn>
            </div>
          )}

          {atual.status === 'qr_pendente' && (
            <div className="flex flex-col items-center gap-3">
              <div className={cn('rounded-xl bg-foreground p-4 transition-opacity', countdown === 0 && 'opacity-30')}>
                {qrImagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCode} alt="QR Code de pareamento do WhatsApp" width={200} height={200} />
                ) : (
                  <QRCodeSVG value={qrCode || 'atendeai'} size={200} />
                )}
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">Abra o WhatsApp no celular, vá em Aparelhos conectados, toque em Conectar aparelho e aponte para este código.</p>
              <p className="flex items-center gap-2 text-xs text-pos">
                {countdown > 0 ? <Loader2 className="size-3 animate-spin" /> : null}
                {countdown > 0 ? `Expira em ${countdown}s` : 'QR Code expirado'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Btn variant="outline" onClick={gerarQr} disabled={loading}>
                  <RefreshCw /> Gerar novo QR
                </Btn>
                {simulado && (
                  <Btn onClick={simularLeitura} disabled={countdown === 0}>
                    <Smartphone /> Simular leitura do QR
                  </Btn>
                )}
              </div>
            </div>
          )}

          {atual.status === 'desconectado' && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6">
              <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <PlugZap className="size-8" />
              </span>
              <p className="text-sm text-muted-foreground">Nenhum número conectado.</p>
              <Btn onClick={gerarQr} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <QrCode />} Gerar QR Code de pareamento
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}