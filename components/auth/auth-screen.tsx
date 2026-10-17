'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, PlayCircle, ShieldCheck } from 'lucide-react'
import { useAtendeAI } from '@/components/atendeai/provider'
import { Btn, Card, Field, Input, Select } from '@/components/atendeai/ui'
import { Logo } from '@/components/atendeai/logo'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SEGMENTOS } from '@/lib/format'

export function AuthScreen({ mode }: { mode: 'login' | 'cadastro' }) {
  const { loginDemo, signIn, signUp } = useAtendeAI()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState('')
  const [form, setForm] = useState({ nome: '', empresa_nome: '', segmento: SEGMENTOS[0], cnpj: '', email: '', password: '' })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 8 && mode === 'cadastro') return setError('A senha precisa ter pelo menos 8 caracteres.')
    setLoading(true)
    try {
      const res = mode === 'login' ? await signIn(form.email.trim(), form.password) : await signUp({ ...form, email: form.email.trim() })
      if (res.error) setError(res.error)
      else if ('info' in res && res.info) setEnviado(res.info)
    } catch {
      setError('Não foi possível conectar ao servidor de autenticação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <div className="flex w-full max-w-md items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <Logo />
      </div>
      <Card className="flex w-full max-w-md flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-balance">{mode === 'login' ? 'Entrar no AtendeAI 360' : 'Criar conta da sua empresa'}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {mode === 'login' ? 'Acesse o painel da sua empresa.' : 'Após o cadastro, sua conta passa por uma aprovação rápida antes de liberar o painel.'}
          </p>
        </div>

        {enviado ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-captacao/30 bg-captacao/10 p-6 text-center">
            <CheckCircle2 className="size-8 text-captacao" />
            <p className="text-sm leading-relaxed">{enviado}</p>
            <Link href="/login" className="text-sm font-medium text-captacao underline-offset-4 hover:underline">
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {mode === 'cadastro' && (
              <>
                <Field label="Seu nome">
                  <Input required value={form.nome} onChange={set('nome')} placeholder="Juliana Martins" autoComplete="name" />
                </Field>
                <Field label="Nome da empresa">
                  <Input required value={form.empresa_nome} onChange={set('empresa_nome')} placeholder="Studio Bella Forma" autoComplete="organization" />
                </Field>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Segmento">
                    <Select value={form.segmento} onChange={set('segmento')}>
                      {SEGMENTOS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="CNPJ (opcional)">
                    <Input value={form.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" inputMode="numeric" />
                  </Field>
                </div>
              </>
            )}
            <Field label="E-mail">
              <Input required type="email" value={form.email} onChange={set('email')} placeholder="voce@empresa.com.br" autoComplete="email" />
            </Field>
            <Field label="Senha">
              <Input
                required
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder={mode === 'cadastro' ? 'Mínimo 8 caracteres' : 'Sua senha'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </Field>
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <Btn type="submit" tone="captacao" disabled={loading || !isSupabaseConfigured}>
              {loading && <Loader2 className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Btn>
            <p className="text-center text-sm text-muted-foreground">
              {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
              <Link href={mode === 'login' ? '/cadastro' : '/login'} className="font-medium text-foreground underline-offset-4 hover:underline">
                {mode === 'login' ? 'Criar conta' : 'Entrar'}
              </Link>
            </p>
          </form>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <Btn variant="outline" className="w-full" onClick={loginDemo}>
          <PlayCircle /> Explorar em Modo Demonstração
        </Btn>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          {isSupabaseConfigured
            ? 'Autenticação segura via Supabase Auth, com sessão em cookie e isolamento por empresa (RLS).'
            : 'Supabase ainda não configurado neste ambiente: login e cadastro reais ficam desativados. O Modo Demonstração usa apenas dados fictícios.'}
        </p>
      </Card>
    </main>
  )
}
