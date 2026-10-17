export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-8 grid-cols-2 gap-0.5 overflow-hidden rounded-lg" aria-hidden>
        <span className="bg-captacao" />
        <span className="bg-ia" />
        <span className="bg-vendas" />
        <span className="bg-pos" />
      </span>
      {!compact && (
        <span className="text-base font-semibold tracking-tight">
          AtendeAI <span className="text-vendas">360</span>
        </span>
      )}
    </span>
  )
}
