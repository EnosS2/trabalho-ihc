import { Check, Lock } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { Button } from '@/components/ui/Button'
import { Aviso, Carregando } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { useEntrar, useUsuariosDemo } from '@/data/hooks'
import { NIVEL_ACESSO, PERMISSOES } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'
import type { Perfil } from '@/domain/types'
import { cn } from '@/lib/cn'

const TAREFAS: Record<Perfil, string[]> = {
  executor: ['Registrar testagem guiada pelo fluxograma', 'Cadastrar pessoas', 'Conduzir o seguimento dos casos'],
  responsavel_tecnico: ['Tudo do executor', 'Estoque, lotes e fechamento SISLOGLAB', 'Enviar notificações e ver indicadores da UBS'],
  acs: ['Lista de busca ativa da microárea', 'Registrar tentativas de contato', 'Sem acesso ao diagnóstico (sigilo)'],
  gestor: ['Indicadores por UBS e território', 'Comparar coordenadorias', 'Sem dados identificados'],
  admin: ['Usuários e unidades', 'Prazos e estoque mínimo', 'Auditoria de acessos'],
}

/** Rota /perfis: fora do menu lateral, acessada pelo menu do usuário. Explica os perfis e permite trocar. */
export default function PerfisPage() {
  const { usuario } = useSessaoAtiva()
  const usuarios = useUsuariosDemo()
  const entrar = useEntrar()
  const navegar = useNavigate()
  const toast = useToast()

  return (
    <>
      <PageHeader
        titulo="Perfis de acesso"
        descricao="Protótipo de demonstração: cada perfil tem um nível de acesso e uma interface diferentes. Troque a qualquer momento pelo menu do usuário, no canto superior direito."
        trilha={[{ rotulo: 'Ajuda', para: '/ajuda' }, { rotulo: 'Perfis de acesso' }]}
      />
      <p className="mb-5 flex w-fit items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
        <Lock className="size-4" aria-hidden /> Na versão final: login gov.br / e-mail institucional
      </p>

      {usuarios.isLoading && <Carregando texto="Carregando perfis…" />}
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {usuarios.data?.map((u) => {
          const nivel = NIVEL_ACESSO[u.perfil]
          const atual = u.id === usuario.id
          return (
            <li
              key={u.id}
              className={cn(
                'flex flex-col gap-3 rounded-xl border-2 bg-surface p-4',
                atual ? 'border-primary' : 'border-border',
              )}
            >
              <span className="w-fit rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-bold text-primary-soft-fg">
                Nível {nivel.nivel}, {nivel.escopo.charAt(0).toLowerCase() + nivel.escopo.slice(1)}
              </span>
              <div>
                <h2 className="text-lg font-bold">{PERFIL_ROTULO[u.perfil]}</h2>
                <p className="text-sm text-muted">
                  {u.nome}, {u.cargo.charAt(0).toLowerCase() + u.cargo.slice(1)}
                  {u.ubsNome ? `, ${u.ubsNome}` : ''}
                </p>
              </div>
              <ul className="flex flex-col gap-1 text-sm">
                {TAREFAS[u.perfil].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="text-primary">•</span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted">{PERMISSOES[u.perfil].length} permissões</span>
                {atual ? (
                  <span className="flex items-center gap-1 text-sm font-bold text-primary">
                    <Check className="size-4" aria-hidden /> Perfil em uso
                  </span>
                ) : (
                  <Button
                    variante="secundario"
                    disabled={entrar.isPending}
                    onClick={async () => {
                      try {
                        await entrar.mutateAsync(u.id)
                        navegar('/')
                      } catch (e) {
                        toast.erro(e)
                      }
                    }}
                  >
                    Usar este perfil
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <Aviso tom="info" className="mt-6" titulo="Dados fictícios">
        Todas as pessoas, unidades e números exibidos foram gerados para demonstração e não correspondem a pessoas
        reais. Os dados ficam apenas no seu navegador.
      </Aviso>
    </>
  )
}
