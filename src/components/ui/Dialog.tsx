import { X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

/**
 * Diálogo modal com <dialog> nativo: foco preso na camada superior, Esc fecha,
 * fundo escurecido (Gestalt figura-fundo) e foco devolvido ao elemento de origem.
 * Com `alteracoesPendentes`, clicar fora, Esc e o X não descartam o que foi digitado sem
 * perguntar antes; o botão "Cancelar" do rodapé continua fechando direto (é uma escolha explícita).
 */
export function Dialog({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = 'md',
  alteracoesPendentes = false,
}: {
  aberto: boolean
  aoFechar: () => void
  titulo: ReactNode
  descricao?: ReactNode
  children?: ReactNode
  rodape?: ReactNode
  largura?: 'sm' | 'md' | 'lg'
  alteracoesPendentes?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const origem = useRef<Element | null>(null)
  const tituloId = useId()
  const descId = useId()
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)

  /** Fechamento "implícito" (X, Esc, clique fora): pergunta antes se há algo preenchido. */
  const pedirFechamento = () => {
    if (alteracoesPendentes) setConfirmandoSaida(true)
    else ref.current?.close()
  }

  useEffect(() => {
    const d = ref.current
    if (!d || !alteracoesPendentes) return
    const aoCancelar = (e: Event) => {
      e.preventDefault()
      setConfirmandoSaida(true)
    }
    d.addEventListener('cancel', aoCancelar)
    return () => d.removeEventListener('cancel', aoCancelar)
  }, [alteracoesPendentes])

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
      setConfirmandoSaida(false)
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
        if (e.target === ref.current) pedirFechamento()
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
              onClick={pedirFechamento}
              className="-m-2 inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-3"
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden />
            </button>
          </header>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {confirmandoSaida ? (
            <footer role="alertdialog" aria-label="Descartar o que foi preenchido?" className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-warning-soft px-5 py-3">
              <p className="mr-auto text-sm font-bold">Descartar o que foi preenchido?</p>
              <Button autoFocus variante="secundario" onClick={() => setConfirmandoSaida(false)}>
                Continuar editando
              </Button>
              <Button variante="perigo" onClick={() => ref.current?.close()}>
                Descartar
              </Button>
            </footer>
          ) : (
            rodape && (
              <footer className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2 px-5 py-3">
                {rodape}
              </footer>
            )
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
  rotuloCancelar = 'Cancelar',
  perigo,
  carregando,
}: {
  aberto: boolean
  aoFechar: () => void
  aoConfirmar: () => void
  titulo: string
  mensagem: ReactNode
  rotuloConfirmar?: string
  rotuloCancelar?: string
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
          <Button variante="secundario" onClick={aoFechar} autoFocus>
            {rotuloCancelar}
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
