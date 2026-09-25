import { Moon, Sun } from 'lucide-react'
import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { usePreferencias } from '@/app/preferencias'
import { cn } from '@/lib/cn'

const DURACAO_MS = 550

function movimentoReduzido(preferenciaDoApp: boolean) {
  return preferenciaDoApp || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Alternância claro/escuro com transição suave:
 * - o novo tema se espalha num círculo a partir do botão (View Transitions API);
 * - sem suporte à API, as cores mudam em fade (classe `tema-em-transicao`);
 * - com "reduzir animações" (do app ou do sistema), a troca é instantânea.
 */
export function AlternarTema() {
  const { prefs, atualizar } = usePreferencias()
  const botao = useRef<HTMLButtonElement>(null)
  const escuro = prefs.tema === 'escuro'
  const rotulo = escuro ? 'Ativar modo claro' : 'Ativar modo escuro'

  function trocar() {
    const novo = escuro ? 'claro' : 'escuro'
    const html = document.documentElement
    const aplicar = () => {
      flushSync(() => atualizar({ tema: novo }))
      html.dataset.tema = novo
    }

    if (movimentoReduzido(prefs.movimentoReduzido)) {
      aplicar()
      return
    }

    if (!document.startViewTransition) {
      html.classList.add('tema-em-transicao')
      aplicar()
      window.setTimeout(() => html.classList.remove('tema-em-transicao'), DURACAO_MS)
      return
    }

    const r = botao.current!.getBoundingClientRect()
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
    const transicao = document.startViewTransition(aplicar)
    transicao.ready
      .then(() => {
        html.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
          { duration: DURACAO_MS, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {
        /* transição interrompida: o tema já foi aplicado */
      })
  }

  // Ícones empilhados: o que sai gira e encolhe, o que entra gira e cresce (com leve efeito de mola).
  const icone =
    'absolute size-5 transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none'
  return (
    <button
      ref={botao}
      type="button"
      onClick={trocar}
      disabled={prefs.altoContraste}
      aria-label={rotulo}
      title={prefs.altoContraste ? 'Indisponível com alto contraste ativo' : rotulo}
      className="relative inline-flex size-11 items-center justify-center overflow-hidden rounded-lg text-sidebar-fg hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Moon aria-hidden className={cn(icone, escuro ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Sun aria-hidden className={cn(icone, escuro ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </button>
  )
}
