import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { NAVEGACAO, type ItemNav } from '@/app/navegacao'
import { useBuscaAtiva, useEstoque, usePainelUbs } from '@/data/hooks'
import { pode } from '@/domain/permissoes'
import { cn } from '@/lib/cn'
import { Acessibilidade } from './Acessibilidade'
import { AlternarTema } from './AlternarTema'
import { Logo } from './Logo'

function useContadores() {
  const { usuario } = useSessaoAtiva()
  const painel = usePainelUbs(pode(usuario, 'caso.ver'))
  const busca = useBuscaAtiva({ status: 'aberta' }, pode(usuario, 'busca.ver'))
  const estoque = useEstoque(pode(usuario, 'estoque.ver'))
  return {
    pendenciasVencidas: painel.data?.resumo.pendenciasVencidas,
    buscaAtiva: busca.data?.length,
    notificacoes: painel.data?.resumo.notificacoesPendentes,
    estoque: estoque.data?.alertas.length,
  } satisfies Record<NonNullable<ItemNav['contador']>, number | undefined>
}

const ROTULO_CONTADOR: Record<NonNullable<ItemNav['contador']>, string> = {
  pendenciasVencidas: 'pendências vencidas',
  buscaAtiva: 'buscas abertas',
  notificacoes: 'notificações pendentes',
  estoque: 'alertas de estoque',
}

function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const { usuario } = useSessaoAtiva()
  const contadores = useContadores()
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-5 px-3 py-4">
      {NAVEGACAO.map((grupo) => {
        const itens = grupo.itens.filter((i) => !i.permissao || pode(usuario, i.permissao))
        if (itens.length === 0) return null
        return (
          <div key={grupo.titulo}>
            <p className="mb-1 px-3 text-xs font-bold tracking-wider text-sidebar-fg/70 uppercase">{grupo.titulo}</p>
            <ul className="flex flex-col gap-0.5">
              {itens.map((item) => {
                const n = item.contador ? contadores[item.contador] : undefined
                return (
                  <li key={item.para}>
                    <NavLink
                      to={item.para}
                      end={item.fim}
                      onClick={aoNavegar}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center gap-3 rounded-lg px-3 font-bold transition-colors',
                          isActive
                            ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--accent-fill)]'
                            : 'text-sidebar-fg hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      <item.icone className="size-5 shrink-0" aria-hidden />
                      <span className="flex-1">{item.rotulo}</span>
                      {n ? (
                        <span className="rounded-full bg-accent-fill px-2 text-xs font-bold text-[#1d1300] tabular">
                          {n}
                          <span className="sr-only"> {ROTULO_CONTADOR[item.contador!]}</span>
                        </span>
                      ) : null}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}

export function Sidebar({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const gaveta = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const el = gaveta.current
    el?.querySelector<HTMLElement>('a, button')?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
      if (e.key === 'Tab' && el) {
        const foco = [...el.querySelectorAll<HTMLElement>('a, button')]
        const [primeiro, ultimo] = [foco[0], foco.at(-1)]
        if (e.shiftKey && document.activeElement === primeiro) {
          e.preventDefault()
          ultimo?.focus()
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault()
          primeiro?.focus()
        }
      }
    }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [aberto, aoFechar])

  return (
    <>
      {/* Desktop: fixa */}
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-sidebar lg:flex">
        <div className="px-5 pt-5 pb-2">
          <Logo claro />
        </div>
        <Navegacao />
        <Rodape />
      </aside>

      {/* Mobile/tablet: gaveta modal */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[rgb(8_18_26/0.55)]" onClick={aoFechar} aria-hidden />
          <div
            ref={gaveta}
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-sidebar shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pt-4">
              <Logo claro />
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar menu"
                className="inline-flex size-11 items-center justify-center rounded-lg text-sidebar-fg hover:bg-white/10"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <Navegacao aoNavegar={aoFechar} />
            <Rodape />
          </div>
        </div>
      )}
    </>
  )
}

/** Preferências de visualização, fixas no canto inferior esquerdo. */
function Rodape() {
  return (
    <div className="mt-auto flex items-center gap-1 px-3 pt-2 pb-4">
      <AlternarTema />
      <Acessibilidade />
    </div>
  )
}
