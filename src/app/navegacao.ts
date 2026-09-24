import type { LucideIcon } from 'lucide-react'
import { ICONE } from '@/components/icones'
import type { Permissao } from '@/domain/permissoes'

export interface ItemNav {
  para: string
  rotulo: string
  icone: LucideIcon
  permissao?: Permissao
  /** Chave do contador exibido ao lado do item. */
  contador?: 'pendenciasVencidas' | 'buscaAtiva' | 'notificacoes' | 'estoque'
  fim?: boolean
}

export interface GrupoNav {
  titulo: string
  itens: ItemNav[]
}

/** Arquitetura de informação: agrupada pelas etapas do trabalho (proximidade). */
export const NAVEGACAO: GrupoNav[] = [
  {
    titulo: 'Atendimento',
    itens: [
      { para: '/', rotulo: 'Painel', icone: ICONE.painel, permissao: 'painel.ver', fim: true },
      { para: '/testagem/nova', rotulo: 'Nova testagem', icone: ICONE.novaTestagem, permissao: 'testagem.registrar' },
      { para: '/testagens', rotulo: 'Testagens', icone: ICONE.testagens, permissao: 'testagem.ver' },
      { para: '/pessoas', rotulo: 'Pessoas', icone: ICONE.pessoas, permissao: 'pessoa.ver' },
    ],
  },
  {
    titulo: 'Acompanhamento',
    itens: [
      { para: '/seguimento', rotulo: 'Seguimento de casos', icone: ICONE.seguimento, permissao: 'caso.ver', contador: 'pendenciasVencidas' },
      { para: '/busca-ativa', rotulo: 'Busca ativa', icone: ICONE.buscaAtiva, permissao: 'busca.ver', contador: 'buscaAtiva' },
      { para: '/notificacoes', rotulo: 'Notificações', icone: ICONE.notificacoes, permissao: 'notificacao.ver', contador: 'notificacoes' },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { para: '/estoque', rotulo: 'Estoque de testes', icone: ICONE.estoque, permissao: 'estoque.ver', contador: 'estoque' },
      { para: '/indicadores', rotulo: 'Indicadores', icone: ICONE.indicadores, permissao: 'indicadores.ubs' },
    ],
  },
  {
    titulo: 'Sistema',
    itens: [
      { para: '/auditoria', rotulo: 'Auditoria', icone: ICONE.auditoria, permissao: 'auditoria.ver' },
      { para: '/configuracoes', rotulo: 'Configurações', icone: ICONE.configuracoes, permissao: 'config.gerir' },
      { para: '/ajuda', rotulo: 'Ajuda', icone: ICONE.ajuda },
    ],
  },
]
