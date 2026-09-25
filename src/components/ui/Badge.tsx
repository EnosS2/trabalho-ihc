import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { ICONE } from '@/components/icones'
import { AGRAVO_ROTULO, AGRAVO_SIGLA, STATUS_CASO_ROTULO } from '@/domain/rotulos'
import type { Agravo, StatusCaso } from '@/domain/types'
import { cn } from '@/lib/cn'
import { descreverPrazo } from '@/lib/datas'

export type Tom = 'neutro' | 'primario' | 'sucesso' | 'atencao' | 'perigo' | 'info' | 'acento'

const tons: Record<Tom, string> = {
  neutro: 'bg-surface-3 text-fg border-border',
  primario: 'bg-primary-soft text-primary-soft-fg border-primary/30',
  sucesso: 'bg-success-soft text-success border-success/30',
  atencao: 'bg-warning-soft text-warning border-warning/30',
  perigo: 'bg-danger-soft text-danger border-danger/30',
  info: 'bg-info-soft text-info border-info/30',
  acento: 'bg-accent-soft text-accent border-accent/30',
}

export function Badge({
  tom = 'neutro',
  icone: Icone,
  children,
  className,
  titulo,
}: {
  tom?: Tom
  icone?: LucideIcon
  children: ReactNode
  className?: string
  titulo?: string
}) {
  return (
    <span
      title={titulo}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap',
        tons[tom],
        className,
      )}
    >
      {Icone && <Icone className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  )
}

const agravoClasses: Record<Agravo, string> = {
  hiv: 'bg-hiv-soft text-hiv border-hiv/40',
  sifilis: 'bg-sif-soft text-sif border-sif/40',
  hepatite_b: 'bg-hbv-soft text-hbv border-hbv/40',
  hepatite_c: 'bg-hcv-soft text-hcv border-hcv/40',
}

/** Signo do agravo: sigla em selo colorido (cor + texto — nunca só cor). */
export function AgravoBadge({ agravo, completo = false }: { agravo: Agravo; completo?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 text-xs leading-5 font-bold',
        agravoClasses[agravo],
      )}
      title={AGRAVO_ROTULO[agravo]}
    >
      {completo ? AGRAVO_ROTULO[agravo] : AGRAVO_SIGLA[agravo]}
      {!completo && <span className="sr-only"> ({AGRAVO_ROTULO[agravo]})</span>}
    </span>
  )
}

export function GestanteBadge() {
  return (
    <Badge tom="acento" icone={ICONE.gestante}>
      Gestante
    </Badge>
  )
}

const statusTom: Record<StatusCaso, { tom: Tom; icone: LucideIcon }> = {
  aguardando_coleta: { tom: 'atencao', icone: ICONE.confirmatorio },
  aguardando_resultado: { tom: 'info', icone: ICONE.aguardando },
  aguardando_tratamento: { tom: 'perigo', icone: ICONE.tratamento },
  em_tratamento: { tom: 'primario', icone: ICONE.tratamento },
  em_seguimento: { tom: 'primario', icone: ICONE.seguimento },
  encerrado: { tom: 'neutro', icone: ICONE.ok },
}

export function StatusCasoBadge({ status, curto }: { status: StatusCaso; curto?: string }) {
  const { tom, icone } = statusTom[status]
  return (
    <Badge tom={tom} icone={icone} titulo={STATUS_CASO_ROTULO[status]}>
      {curto ?? STATUS_CASO_ROTULO[status]}
    </Badge>
  )
}

/** Prazo com três estados: ok (verde/✓), próximo (âmbar/△), vencido (vermelho/✕). */
export function PrazoBadge({ prazo, diasRestantes }: { prazo: string; diasRestantes: number }) {
  const texto = descreverPrazo(prazo)
  if (diasRestantes < 0)
    return (
      <Badge tom="perigo" icone={ICONE.erro}>
        {texto}
      </Badge>
    )
  if (diasRestantes <= 2)
    return (
      <Badge tom="atencao" icone={ICONE.atencao}>
        {texto}
      </Badge>
    )
  return (
    <Badge tom="sucesso" icone={ICONE.prazo}>
      {texto}
    </Badge>
  )
}
