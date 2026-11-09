import { Check, ChevronDown, CircleHelp, LogOut, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { usePode, useSessaoAtiva } from '@/app/sessao'
import { useToast } from '@/components/ui/Toast'
import { useEntrar, useSair, useUsuariosDemo } from '@/data/hooks'
import { NIVEL_ACESSO } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import { BuscaGlobal } from './BuscaGlobal'
import { Logo } from './Logo'
import { SinoAlertas } from './SinoAlertas'
import { Suspenso } from './Suspenso'

export function Topbar({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  const { usuario, ubs, territorio, microarea } = useSessaoAtiva()
  const entrar = useEntrar()
  const sair = useSair()
  const demo = useUsuariosDemo()
  const toast = useToast()
  const navegar = useNavigate()
  const podeBuscar = usePode('pessoa.ver')
  const iniciais = usuario.nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
  const contexto = ubs
    ? [ubs.nome, territorio?.nome, microarea?.descricao].filter(Boolean).join(', ')
    : 'Rede municipal de Porto Alegre'

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
          <Logo semSubtitulo />
        </div>

        {podeBuscar && <BuscaGlobal />}

        <div className="ml-auto flex items-center gap-1">
          <SinoAlertas />
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
                    {PERFIL_ROTULO[usuario.perfil]}, nível {NIVEL_ACESSO[usuario.perfil].nivel}
                  </p>
                  <p className="text-muted">Escopo: {NIVEL_ACESSO[usuario.perfil].escopo}</p>
                  <p className="mt-1 text-muted">{contexto}</p>
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
                <button
                  type="button"
                  disabled={sair.isPending}
                  onClick={async () => {
                    fechar()
                    try {
                      await sair.mutateAsync(undefined)
                      navegar('/entrar', { replace: true })
                    } catch (e) {
                      toast.erro(e)
                    }
                  }}
                  className="flex min-h-11 items-center gap-2 rounded-lg border-t border-border px-2 pt-1 text-left text-sm font-bold text-danger hover:underline"
                >
                  <LogOut className="size-4" aria-hidden /> Sair
                </button>
              </div>
            )}
          </Suspenso>
        </div>
      </div>
    </header>
  )
}
