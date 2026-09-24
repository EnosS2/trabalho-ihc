import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Gestalt — região comum: cada cartão agrupa um único assunto, como os blocos do BMC. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-xl border border-border bg-surface shadow-card', className)} {...rest} />
}

export function CardHeader({
  titulo,
  descricao,
  acoes,
  icone,
  nivel = 2,
  className,
  id,
}: {
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
  icone?: ReactNode
  nivel?: 2 | 3
  className?: string
  id?: string
}) {
  const H = nivel === 2 ? 'h2' : 'h3'
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icone && <span className="mt-0.5 text-primary">{icone}</span>}
        <div className="min-w-0">
          <H id={id} className="text-lg font-bold text-fg">
            {titulo}
          </H>
          {descricao && <p className="text-sm text-muted">{descricao}</p>}
        </div>
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  )
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...rest} />
}
