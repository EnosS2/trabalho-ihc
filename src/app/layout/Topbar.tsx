import { Check, ChevronDown, CircleHelp, Menu } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { useToast } from '@/components/ui/Toast'
import { useEntrar, useUsuariosDemo } from '@/data/hooks'
import { NIVEL_ACESSO } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'

/** Painel suspenso acessível (botão com aria-expanded; fecha com Esc e clique fora). */
function Suspenso({
  rotulo,
  gatilho,
  children,
  alinhar = 'direita',
}: {
  rotulo: string
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
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-fg hover:bg-surface-3"
      >
        {gatilho}
      </button>
      {aberto && (
        <div
          id={id}
          className={cn(
            'absolute top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface p-4 shadow-xl',
            alinhar === 'direita' ? 'right-0' : 'left-0',
          )}
        >
          {children(() => setAberto(false))}
        </div>
      )}
    </div>
  )
}

export function Topbar({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { usuario, ubs, territorio, microarea } = useSessaoAtiva()
  const entrar = useEntrar()
  const demo = useUsuariosDemo()
  const toast = useToast()
  const navegar = useNavigate()
  const iniciais = usuario.nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
  const contexto = ubs ? `${ubs.nome} · ${territorio?.nome ?? ''}${microarea ? ` · ${microarea.descricao}` : ''}` : 'Rede municipal — Porto Alegre'

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      <div className="flex min-h-16 items-center gap-2 px-3 sm:px-6">
        <button
          type="button"
          onClick={aoAbrirMenu}
          aria-label="Abrir menu de navegação"
          className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-3 lg:hidden"
        >
          <Menu className="size-6" aria-hidden />
        </button>
        <div className="lg:hidden">
          <Logo className="[&_p:last-child]:hidden" />
        </div>
        <div className="hidden min-w-0 lg:flex">
          <p className="truncate text-sm text-muted">
            <span className="sr-only">Contexto: </span>
            {contexto}
          </p>
        </div>

        <div className="ml-auto flex items-center">
          <Suspenso
            rotulo={`Menu do usuário ${usuario.nome}`}
            gatilho={
              <>
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary" aria-hidden>
                  {iniciais}
                </span>
                <span className="hidden text-left leading-tight md:block">
                  <span className="block text-sm font-bold">{usuario.nome}</span>
                  <span className="block text-xs text-muted">{PERFIL_ROTULO[usuario.perfil]}</span>
                </span>
                <ChevronDown className="size-4 text-muted" aria-hidden />
              </>
            }
          >
            {(fechar) => (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-bold">{usuario.nome}</p>
                  <p className="text-sm text-muted">{usuario.cargo}</p>
                  <p className="text-sm text-muted">{usuario.email}</p>
                </div>
                <div className="rounded-lg bg-surface-2 p-3 text-sm">
                  <p className="font-bold">
                    Nível {NIVEL_ACESSO[usuario.perfil].nivel} — {PERFIL_ROTULO[usuario.perfil]}
                  </p>
                  <p className="text-muted">Escopo: {NIVEL_ACESSO[usuario.perfil].escopo}</p>
                  <p className="mt-1 text-muted lg:hidden">{contexto}</p>
                </div>
                <div>
                  <h2 id="titulo-trocar-perfil" className="mb-1 text-sm font-bold">
                    Trocar perfil
                  </h2>
                  <ul aria-labelledby="titulo-trocar-perfil" className="flex flex-col">
                    {demo.data?.map((u) => {
                      const atual = u.id === usuario.id
                      return (
                        <li key={u.id}>
                          <button
                            type="button"
                            aria-current={atual || undefined}
                            disabled={atual || entrar.isPending}
                            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left hover:bg-surface-3 disabled:hover:bg-transparent"
                            onClick={async () => {
                              fechar()
                              try {
                                await entrar.mutateAsync(u.id)
                                navegar('/')
                              } catch (e) {
                                toast.erro(e)
                              }
                            }}
                          >
                            <span className="min-w-0 flex-1 leading-tight">
                              <span className="block text-sm font-bold">{PERFIL_ROTULO[u.perfil]}</span>
                              <span className="block truncate text-xs text-muted">{u.nome}</span>
                            </span>
                            {atual && <Check className="size-4 shrink-0 text-primary" aria-label="Perfil em uso" />}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <Link
                  to="/perfis"
                  onClick={fechar}
                  className="flex min-h-11 items-center gap-2 rounded-lg border-t border-border px-2 pt-1 text-sm font-bold text-primary hover:underline"
                >
                  <CircleHelp className="size-4" aria-hidden /> O que muda em cada perfil?
                </Link>
              </div>
            )}
          </Suspenso>
        </div>
      </div>
    </header>
  )
}
