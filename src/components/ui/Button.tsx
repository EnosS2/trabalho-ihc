import { Loader2, type LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '@/lib/cn'

type Variante = 'primario' | 'secundario' | 'fantasma' | 'perigo' | 'sutil'
type Tamanho = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-bold transition-colors select-none disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 whitespace-nowrap'

const variantes: Record<Variante, string> = {
  primario: 'bg-primary text-on-primary hover:bg-primary-hover',
  secundario: 'bg-surface text-fg border border-border-strong hover:bg-surface-3',
  fantasma: 'text-primary hover:bg-primary-soft',
  sutil: 'bg-primary-soft text-primary-soft-fg hover:bg-surface-3',
  perigo: 'bg-danger text-white hover:opacity-90 dark:text-bg',
}

/** Alvos de toque ≥ 44px nos tamanhos md/lg (WCAG 2.5.5). */
const tamanhos: Record<Tamanho, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-[0.95rem]',
  lg: 'min-h-12 px-5 text-base',
}

interface Comum {
  variante?: Variante
  tamanho?: Tamanho
  icone?: LucideIcon
  iconeDireita?: LucideIcon
  children?: ReactNode
}

export function botaoClasses(variante: Variante = 'primario', tamanho: Tamanho = 'md', extra?: string) {
  return cn(base, variantes[variante], tamanhos[tamanho], extra)
}

export function Button({
  variante = 'primario',
  tamanho = 'md',
  icone: Icone,
  iconeDireita: IconeDireita,
  carregando,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: Comum & ButtonHTMLAttributes<HTMLButtonElement> & { carregando?: boolean }) {
  return (
    <button
      type={type}
      className={botaoClasses(variante, tamanho, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...rest}
    >
      {carregando ? (
        <Loader2 className="size-[1.1em] animate-spin" aria-hidden />
      ) : (
        Icone && <Icone className="size-[1.15em] shrink-0" aria-hidden />
      )}
      {children}
      {IconeDireita && <IconeDireita className="size-[1.15em] shrink-0" aria-hidden />}
    </button>
  )
}

export function LinkButton({
  variante = 'primario',
  tamanho = 'md',
  icone: Icone,
  iconeDireita: IconeDireita,
  className,
  children,
  ...rest
}: Comum & LinkProps) {
  return (
    <Link className={botaoClasses(variante, tamanho, className)} {...rest}>
      {Icone && <Icone className="size-[1.15em] shrink-0" aria-hidden />}
      {children}
      {IconeDireita && <IconeDireita className="size-[1.15em] shrink-0" aria-hidden />}
    </Link>
  )
}

/** Botão só com ícone: exige rótulo acessível e mostra tooltip nativo. */
export function IconButton({
  icone: Icone,
  rotulo,
  className,
  ...rest
}: { icone: LucideIcon; rotulo: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg',
        className,
      )}
      {...rest}
    >
      <Icone className="size-5" aria-hidden />
    </button>
  )
}
