import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import type { Tom } from './Badge'

/**
 * Cabeçalho de página: título (h1), descrição e UMA ação primária à direita (pregnância).
 * Também define o título da aba: "<nome da tela> · Testagem UBS". Quando o h1 é pessoal (saudação,
 * nome de pessoa), passe `tituloAba` com o nome genérico da tela — a aba aparece no histórico,
 * na barra de tarefas e em compartilhamento de tela, então nunca leva nome de paciente.
 */
export function PageHeader({
  titulo,
  tituloAba,
  descricao,
  acoes,
  trilha,
}: {
  titulo: string
  tituloAba?: string
  descricao?: ReactNode
  acoes?: ReactNode
  trilha?: { rotulo: string; para?: string }[]
}) {
  useEffect(() => {
    document.title = `${tituloAba ?? titulo} · Testagem UBS`
  }, [tituloAba, titulo])
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
          <h1 className="text-[1.563rem] font-bold text-fg sm:text-[1.953rem]">{titulo}</h1>
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

/** Metadados de uma linha (idade, documentos, datas): separados por espaço, sem "·" entre eles. */
export function Meta({ itens, className }: { itens: ReactNode[]; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted', className)}>
      {itens.filter(Boolean).map((i, k) => (
        <span key={k}>{i}</span>
      ))}
    </span>
  )
}

/**
 * Faixa de números-resumo: uma só superfície dividida por fios finos (proximidade), em vez de
 * vários cartões iguais. Cada <Stat> é uma célula.
 */
export function Resumo({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none',
        // Número ímpar de células em 2 colunas: a última ocupa a linha toda (sem quadrado vazio).
        '[&>:last-child:nth-child(odd)]:col-span-2 lg:[&>:last-child:nth-child(odd)]:col-auto',
        className,
      )}
    >
      {children}
    </dl>
  )
}

/**
 * Célula de <Resumo>: número, o que ele conta e um detalhe. O tom colore só o número; o texto explica.
 * As células de uma faixa ficam da mesma altura: dê `detalhe` a todas ou a nenhuma, senão sobra um
 * vão em branco sob as que não têm. Número, rótulo e detalhe ocupam 3 linhas da grade do <Resumo>
 * (subgrid): se um rótulo quebra em duas linhas, os detalhes de todas as células continuam alinhados.
 */
export function Stat({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
  para,
}: {
  rotulo: string
  valor: ReactNode
  detalhe?: ReactNode
  tom?: Tom
  para?: string
}) {
  const conteudo = (
    <>
      <dd className={cn('row-start-1 text-[1.953rem] leading-none font-bold tabular', statTom[tom])}>{valor}</dd>
      <dt className="row-start-2 mt-1.5 text-sm font-bold text-fg">{rotulo}</dt>
      {detalhe && <dd className="row-start-3 mt-1 text-sm text-muted">{detalhe}</dd>}
    </>
  )
  const classes = 'row-span-3 grid grid-rows-subgrid content-start gap-y-0 bg-surface px-4 py-3.5'
  return para ? (
    <div className={cn(classes, 'relative hover:bg-surface-2')}>
      {conteudo}
      <Link to={para} className="absolute inset-0" aria-label={`${rotulo}: abrir`} />
    </div>
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
