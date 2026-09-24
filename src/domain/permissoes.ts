import type { Perfil, Usuario } from './types'

/**
 * Matriz de permissões (níveis de acesso). Controla menu, rotas e botões.
 * O backend deve aplicar a mesma matriz; o front apenas reflete para a interface.
 */
export type Permissao =
  | 'painel.ver'
  | 'testagem.registrar'
  | 'testagem.ver'
  | 'pessoa.ver'
  | 'pessoa.editar'
  | 'caso.ver'
  | 'caso.editar'
  | 'busca.ver'
  | 'busca.registrar'
  | 'estoque.ver'
  | 'estoque.gerir'
  | 'notificacao.ver'
  | 'notificacao.enviar'
  | 'indicadores.ubs'
  | 'indicadores.rede'
  | 'auditoria.ver'
  | 'config.gerir'

const EXECUTOR: Permissao[] = [
  'painel.ver',
  'testagem.registrar',
  'testagem.ver',
  'pessoa.ver',
  'pessoa.editar',
  'caso.ver',
  'caso.editar',
  'busca.ver',
  'estoque.ver',
  'notificacao.ver',
]

export const PERMISSOES: Record<Perfil, readonly Permissao[]> = {
  acs: ['painel.ver', 'busca.ver', 'busca.registrar'],
  executor: EXECUTOR,
  responsavel_tecnico: [
    ...EXECUTOR,
    'busca.registrar',
    'estoque.gerir',
    'notificacao.enviar',
    'indicadores.ubs',
    'auditoria.ver',
  ],
  gestor: ['painel.ver', 'indicadores.ubs', 'indicadores.rede'],
  admin: ['painel.ver', 'auditoria.ver', 'config.gerir'],
}

/** Nível hierárquico exibido na interface (1 = mais restrito). */
export const NIVEL_ACESSO: Record<Perfil, { nivel: number; escopo: string; descricao: string }> = {
  acs: {
    nivel: 1,
    escopo: 'Própria microárea',
    descricao: 'Vê apenas pessoas da sua microárea com busca ativa pendente e registra tentativas de contato.',
  },
  executor: {
    nivel: 2,
    escopo: 'Própria UBS',
    descricao: 'Registra testagens, cadastra pessoas e conduz o seguimento dos casos da UBS.',
  },
  responsavel_tecnico: {
    nivel: 3,
    escopo: 'Própria UBS (gestão)',
    descricao: 'Além do executor: gerencia estoque, valida e envia notificações e acompanha indicadores da UBS.',
  },
  gestor: {
    nivel: 4,
    escopo: 'Toda a rede (agregado)',
    descricao: 'Consulta indicadores agregados por UBS e território. Não acessa dados identificados.',
  },
  admin: {
    nivel: 5,
    escopo: 'Sistema',
    descricao: 'Gerencia usuários, unidades e parâmetros; consulta auditoria. Não acessa dados clínicos.',
  },
}

export function pode(usuario: Pick<Usuario, 'perfil'> | null | undefined, permissao: Permissao): boolean {
  if (!usuario) return false
  return PERMISSOES[usuario.perfil].includes(permissao)
}
