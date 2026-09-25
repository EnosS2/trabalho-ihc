import { useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Aba<T extends string> {
  id: T
  rotulo: ReactNode
  contagem?: number
}

/** Abas com padrão ARIA (setas, Home/End); o conteúdo é renderizado pelo chamador em <TabPanel>. */
export function Tabs<T extends string>({
  abas,
  ativa,
  onChange,
  rotulo,
  idBase,
}: {
  abas: Aba<T>[]
  ativa: T
  onChange: (id: T) => void
  rotulo: string
  idBase?: string
}) {
  const gerado = useId()
  const base = idBase ?? gerado
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const mover = (i: number) => {
    const n = (i + abas.length) % abas.length
    onChange(abas[n].id)
    refs.current[n]?.focus()
  }
  return (
    <div role="tablist" aria-label={rotulo} className="flex gap-1 relative overflow-x-auto border-b border-border">
      {abas.map((a, i) => {
        const sel = a.id === ativa
        return (
          <button
            key={a.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${a.id}`}
            aria-selected={sel}
            aria-controls={`${base}-painel-${a.id}`}
            tabIndex={sel ? 0 : -1}
            onClick={() => onChange(a.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') mover(i + 1)
              else if (e.key === 'ArrowLeft') mover(i - 1)
              else if (e.key === 'Home') mover(0)
              else if (e.key === 'End') mover(abas.length - 1)
              else return
              e.preventDefault()
            }}
            className={cn(
              '-mb-px flex min-h-11 items-center gap-2 border-b-3 px-4 text-sm font-bold whitespace-nowrap',
              sel ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg',
            )}
          >
            {a.rotulo}
            {a.contagem !== undefined && (
              <span className="rounded-full bg-surface-3 px-2 text-xs tabular text-fg">{a.contagem}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ idBase, id, children, className }: { idBase: string; id: string; children: ReactNode; className?: string }) {
  return (
    <div role="tabpanel" id={`${idBase}-painel-${id}`} aria-labelledby={`${idBase}-tab-${id}`} tabIndex={0} className={className}>
      {children}
    </div>
  )
}
