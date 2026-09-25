import { Link } from 'react-router'
import { cn } from '@/lib/cn'

/** Marca: cassete de teste rápido com as faixas C e T — mesma arte de `public/favicon.svg`. */
export function Logo({
  claro,
  semSubtitulo,
  className,
  aoClicar,
}: {
  claro?: boolean
  semSubtitulo?: boolean
  className?: string
  aoClicar?: () => void
}) {
  // A marca leva ao Painel, como em qualquer site: é o "início" do sistema.
  return (
    <Link
      to="/"
      onClick={aoClicar}
      aria-label="Testagem UBS, ir para o painel"
      className={cn('-m-1 flex w-fit items-center gap-2.5 rounded-lg p-1', className)}
    >
      <svg viewBox="0 0 40 40" className="size-9 shrink-0" aria-hidden>
        <rect width="40" height="40" rx="10" fill="#1d5b7c" />
        <rect x="13" y="5" width="14" height="30" rx="4" fill="#fff" />
        <rect x="16.5" y="10" width="7" height="13" rx="1.5" fill="#dbe8ef" />
        <rect x="16.5" y="13" width="7" height="2.4" rx="1" fill="#c0392b" />
        <rect x="16.5" y="18" width="7" height="2.4" rx="1" fill="#c0392b" />
        <circle cx="20" cy="29" r="2.6" fill="#dbe8ef" />
      </svg>
      <span className="leading-tight">
        <span className={cn('block font-bold', claro ? 'text-white' : 'text-fg')}>Testagem UBS</span>
        {!semSubtitulo && (
          <span className={cn('block text-xs', claro ? 'text-sidebar-fg' : 'text-muted')}>Gestão da testagem rápida</span>
        )}
      </span>
    </Link>
  )
}
