import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/**
 * Diálogo modal com <dialog> nativo: foco preso na camada superior, Esc fecha,
 * fundo escurecido (Gestalt figura-fundo) e foco devolvido ao elemento de origem.
 */
export function Dialog({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'md',
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children?: ReactNode
  rodape?: ReactNode
  largura?: 'sm' | 'md' | 'lg'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const origem = useRef<Element | null>(null)
  const tituloId = useId()
  const descId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (aberto && !d.open) {
      origem.current = document.activeElement
      d.showModal()
    } else if (!aberto && d.open) {
      d.close()
    }
  }, [aberto])

  // Se o pai desmontar o diálogo sem fechá-lo, ainda devolve o foco à origem.
  useEffect(
    () => () => {
      if (origem.current instanceof HTMLElement && document.contains(origem.current)) origem.current.focus()
    },
    [],
  )

  useEffect(() => {
    const d = ref.current
    if (!d) return
    const aoFecharNativo = () => {
      aoFechar()
      if (origem.current instanceof HTMLElement) origem.current.focus()
    }
    d.addEventListener('close', aoFecharNativo)
    return () => d.removeEventListener('close', aoFecharNativo)
  }, [aoFechar])

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      aria-describedby={descricao ? descId : undefined}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface p-0 text-fg shadow-2xl backdrop:backdrop-blur-[2px]',
        { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[largura],
      )}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
    >
      {aberto && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <h2 id={tituloId} className="text-lg font-bold">
                {titulo}
              </h2>
              {descricao && (
                <p id={descId} className="text-sm text-muted">
                  {descricao}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="-m-2 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-3"
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {rodape && (
            <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
              {rodape}
            </footer>
          )}
        </div>
      )}
    </dialog>
  )
}

/** Confirmação antes de ações destrutivas ou irreversíveis (prevenção de erros — Nielsen). */
export function ConfirmDialog({
  aberto,
  aoFechar,
  aoConfirmar,
  titulo,
  mensagem,
  rotuloConfirmar = 'Confirmar',
  perigo,
  carregando,
}: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  mensagem: ReactNode
  rotuloConfirmar?: string
  perigo?: boolean
  carregando?: boolean
}) {
  return (
    <Dialog
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={titulo}
      largura="sm"
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variante={perigo ? 'perigo' : 'primario'} onClick={aoConfirmar} carregando={carregando}>
            {rotuloConfirmar}
          </Button>
        </>
      }
    >
      <div className="text-fg">{mensagem}</div>
    </Dialog>
  )
}
