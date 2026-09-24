import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Outlet } from 'react-router'
import { Carregando } from '@/components/ui/Feedback'
import type { Permissao } from '@/domain/permissoes'
import { AppShell } from './layout/AppShell'
import { ExigePermissao, Protegida } from './sessao'

// Divisão de código por página: gráficos (Recharts) só carregam onde são usados.
const pagina = (carregar: () => Promise<{ default: ComponentType }>) => lazy(carregar)

const Login = pagina(() => import('@/features/auth/LoginPage'))
const Painel = pagina(() => import('@/features/painel/PainelPage'))
const NovaTestagem = pagina(() => import('@/features/testagem/NovaTestagemPage'))
const Testagens = pagina(() => import('@/features/testagem/TestagensPage'))
const TestagemDetalhe = pagina(() => import('@/features/testagem/TestagemDetalhePage'))
const Pessoas = pagina(() => import('@/features/pessoas/PessoasPage'))
const PessoaDetalhe = pagina(() => import('@/features/pessoas/PessoaDetalhePage'))
const PessoaForm = pagina(() => import('@/features/pessoas/PessoaFormPage'))
const Seguimento = pagina(() => import('@/features/seguimento/SeguimentoPage'))
const CasoDetalhe = pagina(() => import('@/features/seguimento/CasoDetalhePage'))
const BuscaAtiva = pagina(() => import('@/features/busca-ativa/BuscaAtivaPage'))
const Notificacoes = pagina(() => import('@/features/notificacoes/NotificacoesPage'))
const Estoque = pagina(() => import('@/features/estoque/EstoquePage'))
const Indicadores = pagina(() => import('@/features/indicadores/IndicadoresPage'))
const Auditoria = pagina(() => import('@/features/auditoria/AuditoriaPage'))
const Configuracoes = pagina(() => import('@/features/config/ConfiguracoesPage'))
const Ajuda = pagina(() => import('@/features/ajuda/AjudaPage'))
const GuiaInterface = pagina(() => import('@/features/ajuda/GuiaInterfacePage'))
const NaoEncontrada = pagina(() => import('@/features/NaoEncontradaPage'))

function com(permissao: Permissao | undefined, elemento: ReactNode) {
  return permissao ? <ExigePermissao permissao={permissao}>{elemento}</ExigePermissao> : elemento
}

const Carregar = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<Carregando texto="Carregando página…" />}>{children}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/entrar',
    element: (
      <Carregar>
        <Login />
      </Carregar>
    ),
  },
  {
    element: (
      <Protegida>
        <AppShell />
      </Protegida>
    ),
    children: [
      {
        element: (
          <Carregar>
            <Outlet />
          </Carregar>
        ),
        children: [
          { index: true, element: com('painel.ver', <Painel />) },
          { path: 'testagem/nova', element: com('testagem.registrar', <NovaTestagem />) },
          { path: 'testagens', element: com('testagem.ver', <Testagens />) },
          { path: 'testagens/:id', element: com('testagem.ver', <TestagemDetalhe />) },
          { path: 'pessoas', element: com('pessoa.ver', <Pessoas />) },
          { path: 'pessoas/nova', element: com('pessoa.editar', <PessoaForm />) },
          { path: 'pessoas/:id', element: com('pessoa.ver', <PessoaDetalhe />) },
          { path: 'pessoas/:id/editar', element: com('pessoa.editar', <PessoaForm />) },
          { path: 'seguimento', element: com('caso.ver', <Seguimento />) },
          { path: 'seguimento/:id', element: com('caso.ver', <CasoDetalhe />) },
          { path: 'busca-ativa', element: com('busca.ver', <BuscaAtiva />) },
          { path: 'notificacoes', element: com('notificacao.ver', <Notificacoes />) },
          { path: 'estoque', element: com('estoque.ver', <Estoque />) },
          { path: 'indicadores', element: com('indicadores.ubs', <Indicadores />) },
          { path: 'auditoria', element: com('auditoria.ver', <Auditoria />) },
          { path: 'configuracoes', element: com('config.gerir', <Configuracoes />) },
          { path: 'ajuda', element: <Ajuda /> },
          { path: 'ajuda/guia-de-interface', element: <GuiaInterface /> },
          { path: '*', element: <NaoEncontrada /> },
        ],
      },
    ],
  },
])
