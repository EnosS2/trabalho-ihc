import { Minus, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import { usePreferencias, type Preferencias } from '@/app/preferencias'

function PainelAcessibilidade() {
  const { prefs, atualizar, restaurar } = usePreferencias()
  const pct = ['100%', '112%', '125%', '137%'][prefs.fonte]
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-bold">Acessibilidade</h2>
      <div>
        <p id="rot-fonte" className="mb-1 text-sm font-bold">
          Tamanho do texto: <span className="tabular">{pct}</span>
        </p>
        <div className="flex gap-2" role="group" aria-labelledby="rot-fonte">
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-border-strong font-bold hover:bg-surface-3 disabled:opacity-50"
            onClick={() => atualizar({ fonte: Math.max(0, prefs.fonte - 1) as Preferencias['fonte'] })}
            disabled={prefs.fonte === 0}
            aria-label="Diminuir texto"
          >
            <Minus className="size-4" aria-hidden /> A
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-border-strong text-lg font-bold hover:bg-surface-3 disabled:opacity-50"
            onClick={() => atualizar({ fonte: Math.min(3, prefs.fonte + 1) as Preferencias['fonte'] })}
            disabled={prefs.fonte === 3}
            aria-label="Aumentar texto"
          >
            <Plus className="size-4" aria-hidden /> A
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block font-bold">Alto contraste</span>
          <span className="text-sm text-muted">Preto sobre branco, bordas fortes</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="size-5 accent-[var(--primary)]"
          checked={prefs.altoContraste}
          onChange={(e) => atualizar({ altoContraste: e.target.checked })}
        />
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>
          <span className="block font-bold">Reduzir animações</span>
          <span className="text-sm text-muted">Remove transições e movimentos</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="size-5 accent-[var(--primary)]"
          checked={prefs.movimentoReduzido}
          onChange={(e) => atualizar({ movimentoReduzido: e.target.checked })}
        />
      </label>
      <button type="button" onClick={restaurar} className="flex items-center gap-2 self-start text-sm font-bold text-primary hover:underline">
        <RotateCcw className="size-4" aria-hidden /> Restaurar padrão
      </button>
    </div>
  )
}

/** Símbolo universal de acesso (pessoa de braços abertos em círculo duplo), no lugar do cadeirante. */
function IconeAcessibilidade() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 shrink-0 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10.75" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="8.25" strokeWidth="1.25" />
      <circle cx="12" cy="7.4" r="1.3" strokeWidth="1.5" />
      <path d="M7.9 10.1h8.2M12 10.1v3.2l-2.2 3.9M12 13.3l2.2 3.9" strokeWidth="1.5" />
    </svg>
  )
}

/**
 * Botão de acessibilidade do rodapé da barra lateral. O painel abre para cima com posição fixa
 * (a barra tem overflow e cortaria um painel absoluto), mas continua no DOM logo após o botão,
 * mantendo a ordem de tabulação e o foco preso da gaveta mobile.
 */
export function Acessibilidade() {
  const [posicao, setPosicao] = useState<CSSProperties | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const id = useId()
  const aberto = posicao !== null

  function abrir() {
    const r = botao.current!.getBoundingClientRect()
    setPosicao({ left: r.left, bottom: window.innerHeight - r.top + 8 })
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = () => setPosicao(null)
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) fechar()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        fechar()
        botao.current?.focus()
      }
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', esc, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  return (
    <div ref={raiz}>
      <button
        ref={botao}
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => (aberto ? setPosicao(null) : abrir())}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-sidebar-fg hover:bg-white/10 hover:text-white"
      >
        <IconeAcessibilidade /> Acessibilidade
      </button>
      {aberto && (
        <div
          id={id}
          style={posicao}
          className="fixed z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 text-fg shadow-xl"
        >
          <PainelAcessibilidade />
        </div>
      )}
    </div>
  )
}
