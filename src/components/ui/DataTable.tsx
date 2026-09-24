import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Coluna<T> {
  chave: string
  cabecalho: ReactNode
  celula: (linha: T) => ReactNode
  className?: string
  /** Alinhamento numérico à direita. */
  numerica?: boolean
  /** Não exibir no cartão mobile (informação secundária). */
  ocultarMobile?: boolean
}

/**
 * Tabela responsiva: em telas ≥ md é uma <table> semântica; em telas pequenas cada linha
 * vira um cartão com pares rótulo/valor (<dl>), sem rolagem horizontal.
 */
export function DataTable<T>({
  colunas,
  linhas,
  chave,
  legenda,
  vazio,
  principal,
}: {
  colunas: Coluna<T>[]
  linhas: T[]
  chave: (l: T) => string
  legenda: string
  vazio?: ReactNode
  /** Conteúdo de destaque no topo do cartão mobile (normalmente o nome com link). */
  principal: (l: T) => ReactNode
}) {
  if (linhas.length === 0) return <>{vazio}</>
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr className="border-b border-border bg-surface-2 text-left text-muted">
              {colunas.map((c) => (
                <th key={c.chave} scope="col" className={cn('px-4 py-3 font-bold', c.numerica && 'text-right', c.className)}>
                  {c.cabecalho}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={chave(l)} className="border-b border-border last:border-0 hover:bg-surface-2">
                {colunas.map((c) => (
                  <td key={c.chave} className={cn('px-4 py-3 align-middle', c.numerica && 'text-right tabular', c.className)}>
                    {c.celula(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden" aria-label={legenda}>
        {linhas.map((l) => (
          <li key={chave(l)} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-2">{principal(l)}</div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {colunas
                .filter((c) => !c.ocultarMobile)
                .map((c) => (
                  <div key={c.chave} className="contents">
                    <dt className="text-muted">{c.cabecalho}</dt>
                    <dd className="min-w-0">{c.celula(l)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
