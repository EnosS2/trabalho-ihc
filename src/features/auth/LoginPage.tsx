import { ArrowRight, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/app/layout/Logo'
import { Aviso, Carregando } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { useEntrar, useSessao, useUsuariosDemo } from '@/data/hooks'
import { NIVEL_ACESSO, PERMISSOES } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import type { Perfil } from '@/domain/types'

const TAREFAS: Record<Perfil, string[]> = {
  executor: ['Registrar testagem guiada pelo fluxograma', 'Cadastrar pessoas', 'Conduzir o seguimento dos casos'],
  responsavel_tecnico: ['Tudo do executor', 'Estoque, lotes e fechamento SISLOGLAB', 'Enviar notificações e ver indicadores da UBS'],
  acs: ['Lista de busca ativa da microárea', 'Registrar tentativas de contato', 'Sem acesso ao diagnóstico (sigilo)'],
  gestor: ['Indicadores por UBS e território', 'Comparar coordenadorias', 'Sem dados identificados'],
  admin: ['Usuários e unidades', 'Prazos e estoque mínimo', 'Auditoria de acessos'],
}

export default function LoginPage() {
  const sessao = useSessao()
  const usuarios = useUsuariosDemo()
  const entrar = useEntrar()
  const navegar = useNavigate()
  const local = useLocation()
  const toast = useToast()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'

  useEffect(() => {
    document.title = 'Entrar · Testagem UBS'
  }, [])

  if (sessao.data) return <Navigate to={destino} replace />

  return (
    <div className="min-h-dvh bg-bg">
      <div className="bg-sidebar px-4 pt-8 pb-28 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Logo claro />
          <h1 className="mt-8 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Da testagem ao tratamento, sem perder ninguém no caminho.
          </h1>
        </div>
      </div>

      <main id="conteudo" className="mx-auto -mt-20 max-w-5xl px-4 pb-12 sm:px-8">
        <section aria-labelledby="titulo-perfis" className="rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-8">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="titulo-perfis" className="text-xl font-bold">
                Escolha um perfil para entrar
              </h2>
              <p className="text-muted">
                Protótipo de demonstração: cada perfil tem um nível de acesso e uma interface diferentes.
              </p>
            </div>
            <p className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              <Lock className="size-4" aria-hidden /> Na versão final: login gov.br / e-mail institucional
            </p>
          </div>

          {usuarios.isLoading && <Carregando texto="Carregando perfis…" />}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {usuarios.data?.map((u) => {
              const nivel = NIVEL_ACESSO[u.perfil]
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={entrar.isPending}
                    onClick={async () => {
                      try {
                        await entrar.mutateAsync(u.id)
                        navegar(destino, { replace: true })
                      } catch (e) {
                        toast.erro(e)
                      }
                    }}
                    className="group flex h-full w-full flex-col gap-3 rounded-xl border-2 border-border bg-surface p-4 text-left transition-colors hover:border-primary hover:bg-surface-2 disabled:opacity-60"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-soft-fg">
                        Nível {nivel.nivel} · {nivel.escopo}
                      </span>
                      <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
                    </div>
                    <span>
                      <span className="block text-lg font-bold">{PERFIL_ROTULO[u.perfil]}</span>
                      <span className="block text-sm text-muted">
                        {u.nome} — {u.cargo}
                        {u.ubsNome ? ` · ${u.ubsNome}` : ''}
                      </span>
                    </span>
                    <ul className="mt-auto flex flex-col gap-1 text-sm">
                      {TAREFAS[u.perfil].map((t) => (
                        <li key={t} className="flex gap-2">
                          <span aria-hidden className="text-primary">•</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                    <span className="text-xs text-muted">{PERMISSOES[u.perfil].length} permissões</span>
                  </button>
                </li>
              )
            })}
          </ul>

          <Aviso tom="info" className="mt-6" titulo="Dados fictícios">
            Todas as pessoas, unidades e números exibidos foram gerados para demonstração e não correspondem a pessoas
            reais. Os dados ficam apenas no seu navegador.
          </Aviso>
        </section>
      </main>
    </div>
  )
}
