'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Banknote, CheckCircle2, Clock, Copy, KeyRound, Plus, QrCode, Receipt, Save, XCircle } from 'lucide-react'
import { useData } from '@/components/atendeai/provider'
import { Badge, Btn, Card, copyText, Empty, Field, Input, Modal, PageHeader, Select, Stat } from '@/components/atendeai/ui'
import { brl, fmtDate, nowIso, uid } from '@/lib/format'
import { gerarPixCopiaECola } from '@/lib/pix'
import type { ConfigLocal, VendaPagamento } from '@/lib/types'
import { cn } from '@/lib/utils'

function PixConfig() {
  const { empresa, config, upsert, updateConfig, notify } = useData()
  const [chave, setChave] = useState(empresa.chave_pix)
  const [tipo, setTipo] = useState<ConfigLocal['tipo_chave']>(config.tipo_chave)
  const [nome, setNome] = useState(config.recebedor_nome)
  const [cidade, setCidade] = useState(config.recebedor_cidade)
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2">
        <KeyRound className="size-4 text-vendas" />
        <h2 className="font-medium">Chave PIX da empresa</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de chave">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as ConfigLocal['tipo_chave'])}>
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
            <option value="email">E-mail</option>
            <option value="telefone">Telefone</option>
            <option value="aleatoria">Aleatória</option>
          </Select>
        </Field>
        <Field label="Chave PIX">
          <Input value={chave} onChange={(e) => setChave(e.target.value)} placeholder={tipo === 'email' ? 'financeiro@empresa.com' : tipo === 'telefone' ? '+5511999998888' : 'Sua chave'} />
        </Field>
        <Field label="Nome do recebedor">
          <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={25} />
        </Field>
        <Field label="Cidade">
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={15} />
        </Field>
      </div>
      <Btn
        className="self-start"
        onClick={() => {
          const normalizada = tipo === 'cpf' || tipo === 'cnpj' ? chave.replace(/\D/g, '') : chave.trim()
          upsert('empresas', { ...empresa, chave_pix: normalizada })
          updateConfig({ tipo_chave: tipo, recebedor_nome: nome, recebedor_cidade: cidade })
          notify({ title: 'Chave PIX salva', description: 'Novas cobranças usarão esta chave.', tone: 'vendas' })
        }}
      >
        <Save /> Salvar configuração
      </Btn>
    </Card>
  )
}

export function Vendas() {
  const { db, empresa, config, confirmarPagamento, upsert, notify } = useData()
  const [qr, setQr] = useState<VendaPagamento | null>(null)
  const [filtro, setFiltro] = useState<'todos' | VendaPagamento['status']>('todos')
  const [novo, setNovo] = useState(false)
  const itens = db.catalogo.filter((c) => c.ativo)
  const [form, setForm] = useState({ nome: '', tel: '', itemId: itens[0]?.id ?? '' })

  const pagas = db.vendas_pagamentos.filter((v) => v.status === 'pago')
  const receita = pagas.reduce((s, v) => s + v.valor, 0)
  const pendentes = db.vendas_pagamentos.filter((v) => v.status === 'pendente')
  const pendenteValor = pendentes.reduce((s, v) => s + v.valor, 0)
  const ticket = pagas.length ? receita / pagas.length : 0
  const lista = [...db.vendas_pagamentos].filter((v) => filtro === 'todos' || v.status === filtro).sort((a, b) => b.created_at.localeCompare(a.created_at))

  async function copiar(code: string) {
    if (await copyText(code)) notify({ title: 'PIX Copia e Cola copiado', tone: 'vendas' })
  }

  function criarAvulsa() {
    const item = itens.find((i) => i.id === form.itemId)
    if (!item || !form.nome) return
    const id = uid()
    upsert('vendas_pagamentos', {
      id,
      empresa_id: empresa.id,
      atendimento_id: null,
      cliente_nome: form.nome,
      cliente_telefone: form.tel.replace(/\D/g, ''),
      item_nome: item.nome,
      valor: item.preco,
      metodo: 'pix',
      codigo_pix: gerarPixCopiaECola({ chave: empresa.chave_pix, nome: config.recebedor_nome, cidade: config.recebedor_cidade, valor: item.preco, txid: `ATD${id.replace(/-/g, '').slice(0, 10)}` }),
      status: 'pendente',
      created_at: nowIso(),
    })
    notify({ title: 'Cobrança PIX gerada', tone: 'vendas' })
    setNovo(false)
    setForm({ ...form, nome: '', tel: '' })
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        eyebrow="Etapa 4"
        title="Vendas & Cobrança PIX"
        description="Cobranças PIX no padrão do Banco Central. Confirmar o recebimento conclui o serviço e aciona o Pós-Venda automaticamente."
        actions={
          <Btn onClick={() => setNovo(true)}>
            <Plus /> Nova cobrança avulsa
          </Btn>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Receita Confirmada" value={brl(receita)} hint={`${pagas.length} pagamentos`} tone="vendas" icon={<Banknote />} />
        <Stat label="Cobranças Pendentes" value={brl(pendenteValor)} hint={`${pendentes.length} aguardando`} tone="pos" icon={<Clock />} />
        <Stat label="Ticket Médio" value={brl(ticket)} hint="Por venda paga" tone="captacao" icon={<Receipt />} />
      </div>
      <PixConfig />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="font-medium">Cobranças geradas</h2>
          <div className="flex gap-1">
            {(['todos', 'pendente', 'pago', 'cancelado'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFiltro(s)}
                className={cn('rounded-full border px-3 py-1 text-xs capitalize', filtro === s ? 'border-vendas bg-vendas/10 text-vendas' : 'border-border text-muted-foreground')}
              >
                {s === 'todos' ? 'Todas' : s}
              </button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? (
          <Empty icon={<QrCode />} title="Nenhuma cobrança" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3 font-medium">QR</th>
                  <th className="p-3 font-medium">Cliente</th>
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Valor</th>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => (
                  <tr key={v.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {v.codigo_pix ? (
                        <button type="button" onClick={() => setQr(v)} className="block rounded bg-foreground p-1" aria-label="Ver QR Code PIX">
                          <QRCodeSVG value={v.codigo_pix} size={36} />
                        </button>
                      ) : (
                        <Badge>{v.metodo}</Badge>
                      )}
                    </td>
                    <td className="p-3 font-medium">{v.cliente_nome}</td>
                    <td className="p-3 text-muted-foreground">{v.item_nome}</td>
                    <td className="p-3 font-semibold">{brl(v.valor)}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(v.created_at)}</td>
                    <td className="p-3">
                      <Badge tone={v.status === 'pago' ? 'vendas' : v.status === 'pendente' ? 'pos' : 'erro'}>{v.status === 'pago' ? 'Pago' : v.status === 'pendente' ? 'Pendente' : 'Cancelado'}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {v.codigo_pix && (
                          <Btn size="sm" variant="ghost" onClick={() => copiar(v.codigo_pix)} aria-label="Copiar PIX">
                            <Copy />
                          </Btn>
                        )}
                        {v.status === 'pendente' && (
                          <>
                            <Btn size="sm" onClick={() => confirmarPagamento(v.id)}>
                              <CheckCircle2 /> Confirmar Recebimento
                            </Btn>
                            <Btn size="sm" variant="ghost" onClick={() => upsert('vendas_pagamentos', { ...v, status: 'cancelado' })} aria-label="Cancelar cobrança">
                              <XCircle />
                            </Btn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!qr} onClose={() => setQr(null)} title="QR Code PIX" description={qr ? `${qr.cliente_nome} · ${qr.item_nome}` : ''}>
        {qr && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-xl bg-foreground p-4">
              <QRCodeSVG value={qr.codigo_pix} size={220} />
            </div>
            <span className="text-2xl font-semibold text-vendas">{brl(qr.valor)}</span>
            <p className="w-full break-all rounded-lg border border-border bg-background p-3 font-mono text-xs text-muted-foreground">{qr.codigo_pix}</p>
            <div className="flex w-full gap-2">
              <Btn variant="outline" className="flex-1" onClick={() => copiar(qr.codigo_pix)}>
                <Copy /> Copiar código
              </Btn>
              {qr.status === 'pendente' && (
                <Btn
                  className="flex-1"
                  onClick={() => {
                    confirmarPagamento(qr.id)
                    setQr(null)
                  }}
                >
                  <CheckCircle2 /> Confirmar Recebimento
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={novo} onClose={() => setNovo(false)} title="Nova cobrança PIX avulsa">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            criarAvulsa()
          }}
        >
          <Field label="Cliente">
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <Input value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} inputMode="tel" />
          </Field>
          <Field label="Item">
            <Select value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
              {itens.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} — {brl(i.preco)}
                </option>
              ))}
            </Select>
          </Field>
          <Btn type="submit">
            <QrCode /> Gerar cobrança
          </Btn>
        </form>
      </Modal>
    </div>
  )
}
