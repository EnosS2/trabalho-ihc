import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ICONE } from '@/components/icones'
import { cn } from '@/lib/cn'

type TipoToast = 'sucesso' | 'erro' | 'info'
interface ToastItem {
  id: number
  tipo: TipoToast
  mensagem: string
}

interface ToastApi {
  sucesso: (m: string) => void
  erro: (m: string | unknown) => void
  info: (m: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

/** Avisos temporários anunciados por leitor de tela (aria-live) — feedback do sistema (Nielsen #1). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ToastItem[]>([])
  const remover = useCallback((id: number) => setItens((xs) => xs.filter((x) => x.id !== id)), [])
  const adicionar = useCallback(
    (tipo: TipoToast, mensagem: string) => {
      const id = Date.now() + Math.random()
      setItens((xs) => [...xs.slice(-3), { id, tipo, mensagem }])
      setTimeout(() => remover(id), tipo === 'erro' ? 9000 : 5000)
    },
    [remover],
  )
  const api = useMemo<ToastApi>(
    () => ({
      sucesso: (m) => adicionar('sucesso', m),
      info: (m) => adicionar('info', m),
      erro: (m) => adicionar('erro', m instanceof Error ? m.message : typeof m === 'string' ? m : 'Ocorreu um erro inesperado.'),
    }),
    [adicionar],
  )
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        <div aria-live="polite" role="status" className="flex w-full flex-col items-center gap-2 sm:items-end">
          {itens
            .filter((i) => i.tipo !== 'erro')
            .map((i) => (
              <ToastView key={i.id} item={i} aoFechar={() => remover(i.id)} />
            ))}
        </div>
        <div aria-live="assertive" role="alert" className="flex w-full flex-col items-center gap-2 sm:items-end">
          {itens
            .filter((i) => i.tipo === 'erro')
            .map((i) => (
              <ToastView key={i.id} item={i} aoFechar={() => remover(i.id)} />
            ))}
        </div>
      </div>
    </Ctx.Provider>
  )
}

function ToastView({ item, aoFechar }: { item: ToastItem; aoFechar: () => void }) {
  const Icone = item.tipo === 'sucesso' ? ICONE.ok : item.tipo === 'erro' ? ICONE.erro : ICONE.info
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-surface p-4 shadow-xl',
        item.tipo === 'sucesso' && 'border-success/50',
        item.tipo === 'erro' && 'border-danger/60',
        item.tipo === 'info' && 'border-info/50',
      )}
    >
      <Icone
        className={cn(
          'mt-0.5 size-5 shrink-0',
          item.tipo === 'sucesso' && 'text-success',
          item.tipo === 'erro' && 'text-danger',
          item.tipo === 'info' && 'text-info',
        )}
        aria-hidden
      />
      <p className="flex-1 text-sm font-bold">{item.mensagem}</p>
      <button type="button" onClick={aoFechar} aria-label="Fechar aviso" className="-m-1 rounded p-1 text-muted hover:bg-surface-3">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast fora do ToastProvider')
  return ctx
}
