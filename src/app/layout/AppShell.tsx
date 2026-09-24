import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

/**
 * Composição: barra lateral (navegação global, fixa em ≥ lg, gaveta em telas menores),
 * barra superior (contexto + acessibilidade + usuário) e área de conteúdo com largura
 * máxima confortável para leitura.
 */
export function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false)
  const local = useLocation()
  const main = useRef<HTMLElement>(null)
  const primeiraRenderizacao = useRef(true)

  // Em navegação SPA, leva o foco ao conteúdo para leitores de tela anunciarem a nova página.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [local.pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:bg-[linear-gradient(to_right,var(--sidebar)_17rem,transparent_17rem)]">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-3 font-bold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>
      <Sidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />
      <div className="flex min-w-0 flex-col">
        <Topbar aoAbrirMenu={() => setMenuAberto(true)} />
        <main
          id="conteudo"
          ref={main}
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted sm:px-6">
          Protótipo acadêmico (IHC) — Edgar Oliveira e Handriel Scheffer. Todos os dados exibidos são fictícios.
        </footer>
      </div>
    </div>
  )
}
