import { X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { NavLink, useLocation } from 'react-router'
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

/**
 * Item ativo = aba da cor da página, encaixada no conteúdo (cantos côncavos em cima e embaixo):
 * diz "você está aqui" pela continuidade com a página, não por uma barra decorativa.
 * Na barra fixa, a aba é UM elemento só que desliza até o item novo e acompanha a altura dele
 * (o texto troca de cor junto); "reduzir animações" torna a troca instantânea (regra global do CSS).
 * Na gaveta mobile não há página ao lado, então o item ativo vira uma pílula da mesma cor, sem deslize.
 */
const abaEncaixada = cn(
  'rounded-l-lg bg-bg',
  "before:absolute before:-top-3 before:right-0 before:size-3 before:bg-[radial-gradient(circle_at_0_0,transparent_12px,var(--bg)_12.5px)] before:content-['']",
  "after:absolute after:right-0 after:-bottom-3 after:size-3 after:bg-[radial-gradient(circle_at_0_100%,transparent_12px,var(--bg)_12.5px)] after:content-['']",
)

/** Posição da aba: mede o link ativo (aria-current) em relação ao <nav>; remede ao trocar de rota ou redimensionar. */
function useAbaDeslizante(nav: RefObject<HTMLElement | null>, ativo: boolean) {
  const { pathname } = useLocation()
  const [pos, setPos] = useState<{ top: number; height: number } | null>(null)
  const [animar, setAnimar] = useState(false)

  useLayoutEffect(() => {
    if (!ativo) return
    const el = nav.current
    if (!el) return
    const medir = () => {
      const link = el.querySelector<HTMLElement>('a[aria-current="page"]')
      if (!link) return setPos(null)
      const r = link.getBoundingClientRect()
      const base = el.getBoundingClientRect()
      setPos({ top: r.top - base.top, height: r.height })
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [nav, ativo, pathname])

  // Só anima depois da primeira medição: ao abrir o app a aba já nasce no lugar, sem deslizar do topo.
  useEffect(() => {
    if (pos && !animar) {
      const id = requestAnimationFrame(() => setAnimar(true))
      return () => cancelAnimationFrame(id)
    }
  }, [pos, animar])

  return { pos, animar }
}

function Navegacao({ aoNavegar, emGaveta }: { aoNavegar?: () => void; emGaveta?: boolean }) {
  const { usuario } = useSessaoAtiva()
  const contadores = useContadores()
  const nav = useRef<HTMLElement>(null)
  const { pos, animar } = useAbaDeslizante(nav, !emGaveta)
  return (
    <nav ref={nav} aria-label="Navegação principal" className={cn('relative flex flex-col gap-5 py-4 pl-3', emGaveta && 'pr-3')}>
      {!emGaveta && pos && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute top-0 right-0 left-3',
            abaEncaixada,
            animar && 'transition-[transform,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]',
          )}
          style={{ transform: `translateY(${pos.top}px)`, height: pos.height }}
        />
      )}
      {NAVEGACAO.map((grupo) => {
        const itens = grupo.itens.filter((i) => !i.permissao || pode(usuario, i.permissao))
        if (itens.length === 0) return null
        return (
          <div key={grupo.titulo}>
            <p className="mb-1 px-3 text-sm text-sidebar-fg/75">{grupo.titulo}</p>
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
                          'relative flex min-h-11 items-center gap-3 rounded-lg px-3 font-bold transition-colors duration-300',
                          !emGaveta && 'mr-3',
                          isActive
                            ? cn('text-fg [&>svg]:text-primary', emGaveta && 'bg-bg')
                            : 'text-sidebar-fg hover:bg-white/10 hover:text-white',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icone className="size-5 shrink-0" aria-hidden />
                          <span className="flex-1">{item.rotulo}</span>
                          {n ? (
                            <span
                              className={cn(
                                'rounded-full px-2 text-xs font-bold tabular',
                                item.contador === 'pendenciasVencidas'
                                  ? 'bg-danger text-white dark:text-bg'
                                  : isActive
                                    ? 'bg-primary-soft text-primary-soft-fg'
                                    : 'bg-white/15 text-white',
                              )}
                            >
                              {n}
                              <span className="sr-only"> {ROTULO_CONTADOR[item.contador!]}</span>
                            </span>
                          ) : null}
                        </>
                      )}
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
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-sidebar [--focus:var(--focus-sobre-escuro)] lg:flex">
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
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col overflow-y-auto bg-sidebar shadow-2xl [--focus:var(--focus-sobre-escuro)]"
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
            <Navegacao aoNavegar={aoFechar} emGaveta />
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
