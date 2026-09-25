import { useEffect, useRef, type ReactNode } from 'react'
import { Aviso, Carregando } from '@/components/ui/Feedback'
import { LinkButton } from '@/components/ui/Button'
import type { Sessao } from '@/data/api'
import { useEntrarComPerfilPadrao, useSessao } from '@/data/hooks'
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

/** Protótipo sem tela de login: sem sessão, entra com o perfil padrão; a troca de perfil fica no menu do usuário. */
export function Protegida({ children }: { children: ReactNode }) {
  const { data, isLoading } = useSessao()
  const entrar = useEntrarComPerfilPadrao()
  const tentou = useRef(false)
  const semSessao = !isLoading && !data
  useEffect(() => {
    if (semSessao && !tentou.current) {
      tentou.current = true
      entrar.mutate(undefined)
    }
  }, [semSessao, entrar])
  if (entrar.isError) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Aviso tom="perigo" titulo="Não foi possível entrar">
          {entrar.error.message}
        </Aviso>
      </div>
    )
  }
  if (!data) return <Carregando texto="Entrando…" className="min-h-dvh" />
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
