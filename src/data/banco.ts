import type {
  Caso,
  EventoAuditoria,
  LoteInsumo,
  Microarea,
  MovimentacaoEstoque,
  Notificacao,
  Parametros,
  Pessoa,
  TarefaBuscaAtiva,
  Territorio,
  Testagem,
  Ubs,
  Usuario,
} from '@/domain/types'

/** Estrutura do "banco" mock — equivale às tabelas do futuro backend. */
export interface Banco {
  versao: number
  geradoEm: string
  parametros: Parametros
  territorios: Territorio[]
  ubs: Ubs[]
  microareas: Microarea[]
  usuarios: Usuario[]
  pessoas: Pessoa[]
  testagens: Testagem[]
  casos: Caso[]
  notificacoes: Notificacao[]
  tarefas: TarefaBuscaAtiva[]
  lotes: LoteInsumo[]
  movimentacoes: MovimentacaoEstoque[]
  auditoria: EventoAuditoria[]
}

export const VERSAO_BANCO = 2

let contador = 0
export function novoId(prefixo: string): string {
  contador = (contador + 1) % 1_000_000
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefixo}-${aleatorio}${contador.toString(36)}`
}
