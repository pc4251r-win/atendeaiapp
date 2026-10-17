'use client'

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Tone = 'captacao' | 'ia' | 'vendas' | 'pos' | 'neutral' | 'erro'

export const toneText: Record<Tone, string> = {
  captacao: 'text-captacao',
  ia: 'text-ia',
  vendas: 'text-vendas',
  pos: 'text-pos',
  neutral: 'text-muted-foreground',
  erro: 'text-destructive',
}
export const toneSoft: Record<Tone, string> = {
  captacao: 'bg-captacao/10 text-captacao border-captacao/30',
  ia: 'bg-ia/10 text-ia border-ia/30',
  vendas: 'bg-vendas/10 text-vendas border-vendas/30',
  pos: 'bg-pos/10 text-pos border-pos/30',
  neutral: 'bg-secondary text-muted-foreground border-border',
  erro: 'bg-destructive/10 text-destructive border-destructive/30',
}
const toneSolid: Record<Tone, string> = {
  captacao: 'bg-captacao text-foreground hover:bg-captacao/90',
  ia: 'bg-ia text-foreground hover:bg-ia/90',
  vendas: 'bg-vendas text-on-accent hover:bg-vendas/90',
  pos: 'bg-pos text-on-accent hover:bg-pos/90',
  neutral: 'bg-secondary text-foreground hover:bg-secondary/80',
  erro: 'bg-destructive text-foreground hover:bg-destructive/90',
}

export function Btn({
  tone = 'vendas',
  variant = 'solid',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; variant?: 'solid' | 'soft' | 'ghost' | 'outline'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        size === 'sm' && 'h-8 px-3 text-xs',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        variant === 'solid' && toneSolid[tone],
        variant === 'soft' && cn('border hover:brightness-125', toneSoft[tone]),
        variant === 'outline' && 'border border-border bg-transparent text-foreground hover:bg-secondary',
        variant === 'ghost' && 'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
        className,
      )}
    />
  )
}

export function Card({ className, children, ...props }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('rounded-xl border border-border bg-card', className)}>
      {children}
    </div>
  )
}

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', toneSoft[tone], className)}>
      {children}
    </span>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  tone = 'vendas',
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  tone?: Tone
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        {eyebrow && <span className={cn('font-mono text-xs uppercase tracking-widest', toneText[tone])}>{eyebrow}</span>}
        <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, hint, tone = 'neutral', icon }: { label: string; value: ReactNode; hint?: string; tone?: Tone; icon?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className={cn('flex size-8 items-center justify-center rounded-lg border [&_svg]:size-4', toneSoft[tone])}>{icon}</span>}
      </div>
      <span className="text-2xl font-semibold tracking-tight">{value}</span>
      {hint && <span className={cn('text-xs', toneText[tone])}>{hint}</span>}
    </Card>
  )
}

const fieldBase =
  'w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, 'h-10', className)} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, 'min-h-24 py-2 leading-relaxed', className)} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(fieldBase, 'h-10 appearance-auto', className)}>
      {children}
    </select>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors', checked ? 'bg-vendas' : 'bg-secondary')}
    >
      <span className={cn('inline-block size-4 rounded-full bg-foreground transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  size?: 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:rounded-2xl',
          size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-5">{icon}</span>
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4',
            value === it.value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
