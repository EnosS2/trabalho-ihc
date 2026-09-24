import { Loader2, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ICONE } from '@/components/icones'
import { cn } from '@/lib/cn'
import type { Tom } from './Badge'

export function Carregando({ texto = 'Carregando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-10 text-muted', className)}>
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{texto}</span>
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-3', className)} />
}

export function EstadoVazio({
  icone: Icone = ICONE.ok,
  titulo,
  descricao,
  acao,
}: {
  icone?: LucideIcon
  titulo: string
  descricao?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icone className="size-6" aria-hidden />
      </span>
      <p className="font-bold">{titulo}</p>
      {descricao && <p className="max-w-md text-sm text-muted">{descricao}</p>}
      {acao && <div className="mt-2">{acao}</div>}
    </div>
  )
}

export function EstadoErro({ erro, tentarNovamente }: { erro: unknown; tentarNovamente?: () => void }) {
  const msg = erro instanceof Error ? erro.message : 'Não foi possível carregar os dados.'
  return (
    <Aviso tom="perigo" titulo="Algo deu errado">
      <p>{msg}</p>
      {tentarNovamente && (
        <button type="button" onClick={tentarNovamente} className="mt-2 font-bold underline">
          Tentar novamente
        </button>
      )}
    </Aviso>
  )
}

const avisoTons: Record<Exclude<Tom, 'neutro' | 'primario'>, { classes: string; icone: LucideIcon }> = {
  info: { classes: 'bg-info-soft border-info/40 text-fg [&_.av-ic]:text-info', icone: ICONE.info },
  sucesso: { classes: 'bg-success-soft border-success/40 text-fg [&_.av-ic]:text-success', icone: ICONE.ok },
  atencao: { classes: 'bg-warning-soft border-warning/50 text-fg [&_.av-ic]:text-warning', icone: ICONE.atencao },
  perigo: { classes: 'bg-danger-soft border-danger/50 text-fg [&_.av-ic]:text-danger', icone: ICONE.erro },
  acento: { classes: 'bg-accent-soft border-accent/40 text-fg [&_.av-ic]:text-accent', icone: ICONE.atencao },
}

/** Aviso contextual: cor + ícone + título (a informação nunca depende só da cor). */
export function Aviso({
  tom = 'info',
  titulo,
  children,
  icone,
  className,
  acao,
}: {
  tom?: keyof typeof avisoTons
  titulo?: ReactNode
  children?: ReactNode
  icone?: LucideIcon
  className?: string
  acao?: ReactNode
}) {
  const { classes, icone: Padrao } = avisoTons[tom]
  const Icone = icone ?? Padrao
  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', classes, className)}>
      <Icone className="av-ic mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-sm">
        {titulo && <p className="font-bold text-[0.95rem]">{titulo}</p>}
        {children}
      </div>
      {acao && <div className="shrink-0 self-center">{acao}</div>}
    </div>
  )
}
