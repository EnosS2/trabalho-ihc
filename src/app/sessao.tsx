import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Carregando } from '@/components/ui/Feedback'
import { LinkButton } from '@/components/ui/Button'
import type { Sessao } from '@/data/api'
import { useSessao } from '@/data/hooks'
import { pode, type Permissao } from '@/domain/permissoes'
import { ICONE } from '@/components/icones'

/** Sessão garantida: usar apenas dentro de rotas protegidas. */
export function useSessaoAtiva(): Sessao {
  const { data } = useSessao()
  if (!data) throw new Error('useSessaoAtiva fora de rota protegida')
  return data
}

export function usePode(permissao: Permissao): boolean {
  const { data } = useSessao()
  return pode(data?.usuario, permissao)
}

export function Protegida({ children }: { children: ReactNode }) {
  const { data, isLoading } = useSessao()
  const local = useLocation()
  if (isLoading) return <Carregando texto="Verificando sessão…" className="min-h-dvh" />
  if (!data) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <>{children}</>
}

export function ExigePermissao({ permissao, children }: { permissao: Permissao; children: ReactNode }) {
  const permitido = usePode(permissao)
  if (!permitido) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
        <ICONE.auditoria className="size-10 text-muted" aria-hidden />
        <h1 className="text-2xl font-bold">Acesso restrito</h1>
        <p className="text-muted">
          Seu perfil não tem permissão para esta área. Se precisar de acesso, fale com a responsável técnica da UBS ou
          com o suporte.
        </p>
        <LinkButton to="/" variante="secundario">
          Voltar ao painel
        </LinkButton>
      </div>
    )
  }
  return <>{children}</>
}
