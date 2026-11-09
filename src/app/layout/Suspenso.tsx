import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Painel suspenso acessível (botão com aria-expanded; fecha com Esc e clique fora). */
export function Suspenso({
  rotulo,
  gatilho,
  children,
  alinhar = 'direita',
  classeGatilho,
  classePainel,
}: {
  rotulo: string
  classeGatilho?: string
  /** Substitui o posicionamento padrão do painel (ex.: largura total no celular). */
  classePainel?: string
  gatilho: ReactNode
  children: (fechar: () => void) => ReactNode
  alinhar?: 'direita' | 'esquerda'
}) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const id = useId()
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAberto(false)
        botao.current?.focus()
      }
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc)
    }
  }, [aberto])
  return (
    <div ref={raiz} className="relative">
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={rotulo}
        onClick={() => setAberto((a) => !a)}
        className={cn('flex min-h-11 items-center gap-2 rounded-lg px-2 text-fg hover:bg-surface-3', classeGatilho)}
      >
        {gatilho}
      </button>
      {aberto && (
        <div
          id={id}
          className={cn(
            'absolute top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-xl',
            alinhar === 'direita' ? 'right-0' : 'left-0',
            classePainel,
          )}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  )
}
