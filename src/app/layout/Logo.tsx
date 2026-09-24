import { cn } from '@/lib/cn'

/** Marca: gota com sinal de "+" (saúde) dentro de um frasco — testagem rápida na UBS. */
export function Logo({ claro, className }: { claro?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill="var(--accent-fill)" />
        <path d="M20 7c5 7 9 11.5 9 16.5a9 9 0 0 1-18 0C11 18.5 15 14 20 7Z" fill="#173447" />
        <path d="M20 18v10M15 23h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div className="leading-tight">
        <p className={cn('font-bold', claro ? 'text-white' : 'text-fg')}>Testagem UBS</p>
        <p className={cn('text-xs', claro ? 'text-sidebar-fg' : 'text-muted')}>Gestão da testagem rápida</p>
      </div>
    </div>
  )
}
