import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import type { Tom } from './Badge'

/** Cabeçalho de página: título (h1), descrição e UMA ação primária à direita (pregnância). */
export function PageHeader({
  titulo,
  descricao,
  acoes,
  trilha,
}: {
  titulo: string
  descricao?: ReactNode
  acoes?: ReactNode
  trilha?: { rotulo: string; para?: string }[]
}) {
  useEffect(() => {
    document.title = `${titulo} · Testagem UBS`
  }, [titulo])
  return (
    <header className="mb-6 flex flex-col gap-3">
      {trilha && (
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted">
            {trilha.map((t, i) => (
              <li key={t.rotulo} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-4" aria-hidden />}
                {t.para ? (
                  <Link to={t.para} className="rounded hover:text-primary hover:underline">
                    {t.rotulo}
                  </Link>
                ) : (
                  <span aria-current="page">{t.rotulo}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">{titulo}</h1>
          {descricao && <p className="mt-1 max-w-3xl text-muted">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
      </div>
    </header>
  )
}

const statTom: Record<Tom, string> = {
  neutro: 'text-fg',
  primario: 'text-primary',
  sucesso: 'text-success',
  atencao: 'text-warning',
  perigo: 'text-danger',
  info: 'text-info',
  acento: 'text-accent',
}

/** Indicador-chave (KPI). O tom colore o ícone e o valor; o texto explica o número. */
export function Stat({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  tom = 'neutro',
  para,
}: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  icone?: LucideIcon
  tom?: Tom
  para?: string
}) {
  const conteudo = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted">{rotulo}</p>
        {Icone && <Icone className={cn('size-5', statTom[tom])} aria-hidden />}
      </div>
      <p className={cn('mt-1 text-3xl font-bold', statTom[tom])}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-sm text-muted">{detalhe}</p>}
    </>
  )
  const classes = 'block rounded-xl border border-border bg-surface p-4 shadow-card'
  return para ? (
    <Link to={para} className={cn(classes, 'transition-colors hover:border-primary hover:bg-surface-2')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classes}>{conteudo}</div>
  )
}

/** Barra de progresso com rótulo e valor em texto (Gestalt fechamento). */
export function Medidor({
  rotulo,
  valor,
  max = 100,
  tom = 'primario',
  texto,
  compacto,
}: {
  rotulo: string
  valor: number
  max?: number
  tom?: Tom
  texto?: string
  compacto?: boolean
}) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100))
  const cor = {
    neutro: 'bg-border-strong',
    primario: 'bg-primary',
    sucesso: 'bg-success',
    atencao: 'bg-accent-fill',
    perigo: 'bg-danger',
    info: 'bg-info',
    acento: 'bg-accent-fill',
  }[tom]
  return (
    <div>
      {!compacto && (
        <div className="mb-1 flex justify-between gap-2 text-sm">
          <span className="font-bold">{rotulo}</span>
          <span className="tabular text-muted">{texto ?? `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div
        role="meter"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={valor}
        aria-valuetext={texto ?? `${Math.round(pct)}%`}
        className="h-2.5 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div className={cn('h-full rounded-full', cor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Stepper({ passos, atual }: { passos: string[]; atual: number }) {
  return (
    <nav aria-label="Etapas">
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {passos.map((p, i) => {
          const feito = i < atual
          const ativo = i === atual
          return (
            <li key={p} className="flex shrink-0 items-center gap-2" aria-current={ativo ? 'step' : undefined}>
              {i > 0 && <span aria-hidden className={cn('h-0.5 w-6 sm:w-10', feito || ativo ? 'bg-primary' : 'bg-border')} />}
              <span
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-sm font-bold tabular',
                  feito && 'border-primary bg-primary text-on-primary',
                  ativo && 'border-primary bg-primary-soft text-primary',
                  !feito && !ativo && 'border-border text-muted',
                )}
              >
                {feito ? '✓' : i + 1}
              </span>
              <span className={cn('text-sm font-bold', ativo ? 'text-fg' : 'text-muted', !ativo && 'hidden sm:inline')}>
                {p}
                {feito && <span className="sr-only"> (concluída)</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export interface ItemLinhaDoTempo {
  id: string
  data: string
  titulo: ReactNode
  descricao?: ReactNode
  icone: LucideIcon
  tom?: Tom
}

/** Linha do tempo (Gestalt continuidade): eventos do caso em sequência. */
export function LinhaDoTempo({ itens }: { itens: ItemLinhaDoTempo[] }) {
  return (
    <ol className="relative flex flex-col gap-5 border-l-2 border-border pl-6">
      {itens.map((i) => (
        <li key={i.id} className="relative">
          <span
            className={cn(
              'absolute top-0 -left-[2.3rem] flex size-8 items-center justify-center rounded-full border-2 border-surface bg-surface-3',
              statTom[i.tom ?? 'neutro'],
            )}
          >
            <i.icone className="size-4" aria-hidden />
          </span>
          <p className="text-xs font-bold text-muted tabular">{i.data}</p>
          <p className="font-bold">{i.titulo}</p>
          {i.descricao && <div className="text-sm text-muted">{i.descricao}</div>}
        </li>
      ))}
    </ol>
  )
}

export function DescricaoLista({ itens, colunas = 2 }: { itens: { rotulo: string; valor: ReactNode }[]; colunas?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3', colunas === 2 && 'sm:grid-cols-2', colunas === 3 && 'sm:grid-cols-2 lg:grid-cols-3')}>
      {itens.map((i) => (
        <div key={i.rotulo} className="min-w-0">
          <dt className="text-sm text-muted">{i.rotulo}</dt>
          <dd className="font-bold break-words">{i.valor}</dd>
        </div>
      ))}
    </dl>
  )
}
