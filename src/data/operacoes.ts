/**
 * Operações de escrita "do lado do servidor". São usadas pela API mock e pelo seed,
 * e servem de especificação para os casos de uso do futuro backend.
 */
import { agoraISO, somarDias } from '@/lib/datas'
import { interpretarTestagem, testagemConcluida } from '@/domain/rules/fluxograma'
import { classificarNotificacao, prazoNotificacao } from '@/domain/rules/notificacao'
import {
  aplicarAcao,
  criarCaso,
  pendenciasDoCaso,
  pendenciasParaBuscaAtiva,
  type AcaoCaso,
} from '@/domain/rules/seguimento'
import { loteUtilizavel } from '@/domain/rules/estoque'
import { AGRAVO_ROTULO, TIPO_TESTE_ROTULO } from '@/domain/rotulos'
import type {
  Agravo,
  Caso,
  EventoAuditoria,
  ISODate,
  MotivoTestagem,
  ResultadoTR,
  Testagem,
  TipoTeste,
} from '@/domain/types'
import { novoId, type Banco } from './banco'

export class ErroDeNegocio extends Error {}

export interface NovaTestagemInput {
  pessoaId: string
  ubsId: string
  executorId: string
  data: ISODate
  motivo: MotivoTestagem
  gestante: boolean
  idadeGestacionalSemanas?: number
  exposicaoRecente: boolean
  agravos: Agravo[]
  testes: { tipo: TipoTeste; loteId: string; resultado: ResultadoTR }[]
  observacoes?: string
  /** Gestante com sífilis reagente: 1ª dose aplicada no ato. */
  primeiraDoseSifilisAplicada?: boolean
}

export function auditar(banco: Banco, evento: Omit<EventoAuditoria, 'id' | 'data'> & { data?: string }) {
  banco.auditoria.push({ id: novoId('aud'), data: evento.data ?? agoraISO(), ...evento })
}

export function hidratarTestagem(t: Testagem): Testagem {
  return {
    ...t,
    interpretacoes: interpretarTestagem(t.agravos, t.testes, {
      gestante: t.gestante,
      exposicaoRecente: t.exposicaoRecente,
    }),
  }
}

export function registrarTestagemOp(banco: Banco, input: NovaTestagemInput) {
  const pessoa = banco.pessoas.find((p) => p.id === input.pessoaId)
  if (!pessoa) throw new ErroDeNegocio('Pessoa não encontrada.')
  if (input.agravos.length === 0) throw new ErroDeNegocio('Selecione ao menos um agravo.')

  const testes = input.testes.map((t, i) => ({ ...t, id: novoId('tst'), ordem: i + 1 }))
  const interpretacoes = interpretarTestagem(input.agravos, testes, {
    gestante: input.gestante,
    exposicaoRecente: input.exposicaoRecente,
  })
  if (!testagemConcluida(interpretacoes)) {
    throw new ErroDeNegocio('O fluxograma ainda exige testes adicionais antes de finalizar.')
  }

  // Baixa de estoque (um dispositivo por teste, inclusive inválidos).
  const usoPorLote = new Map<string, number>()
  for (const t of testes) usoPorLote.set(t.loteId, (usoPorLote.get(t.loteId) ?? 0) + 1)
  for (const t of testes) {
    const lote = banco.lotes.find((l) => l.id === t.loteId)
    if (!lote || lote.tipo !== t.tipo) throw new ErroDeNegocio(`Lote inválido para ${TIPO_TESTE_ROTULO[t.tipo]}.`)
    if (!loteUtilizavel(lote, input.data)) {
      throw new ErroDeNegocio(`O lote ${lote.lote} está vencido ou sem saldo.`)
    }
    if (usoPorLote.get(lote.id)! > lote.quantidadeAtual) {
      throw new ErroDeNegocio(`O lote ${lote.lote} tem apenas ${lote.quantidadeAtual} unidade(s).`)
    }
  }
  const testagemId = novoId('tsg')
  for (const t of testes) {
    const lote = banco.lotes.find((l) => l.id === t.loteId)!
    lote.quantidadeAtual -= 1
    banco.movimentacoes.push({
      id: novoId('mov'),
      loteId: lote.id,
      ubsId: input.ubsId,
      tipo: 'consumo',
      quantidade: -1,
      data: input.data,
      usuarioId: input.executorId,
      testagemId,
    })
  }

  const testagem: Testagem = {
    id: testagemId,
    pessoaId: input.pessoaId,
    ubsId: input.ubsId,
    executorId: input.executorId,
    data: input.data,
    motivo: input.motivo,
    gestante: input.gestante,
    idadeGestacionalSemanas: input.idadeGestacionalSemanas,
    exposicaoRecente: input.exposicaoRecente,
    agravos: input.agravos,
    testes,
    interpretacoes,
    casoIds: [],
    observacoes: input.observacoes,
  }

  const casos: Caso[] = []
  for (const i of interpretacoes.filter((x) => x.abreCaso)) {
    const caso = criarCaso(
      {
        id: novoId('cas'),
        pessoaId: input.pessoaId,
        ubsId: input.ubsId,
        testagemId,
        data: input.data,
        gestante: input.gestante,
        responsavelId: input.executorId,
        interpretacao: i,
        primeiraDoseAplicada: i.agravo === 'sifilis' && input.primeiraDoseSifilisAplicada,
      },
      banco.parametros,
    )
    casos.push(caso)
    testagem.casoIds.push(caso.id)
    banco.casos.push(caso)
    sincronizarNotificacao(banco, caso)
  }

  if (input.gestante && !pessoa.gestante) {
    pessoa.gestante = true
    if (input.idadeGestacionalSemanas !== undefined && !pessoa.dum) {
      pessoa.dum = somarDias(input.data, -input.idadeGestacionalSemanas * 7)
    }
  }
  banco.testagens.push(testagem)
  return { testagem, casos }
}

export function executarAcaoCasoOp(banco: Banco, casoId: string, acao: AcaoCaso): Caso {
  const idx = banco.casos.findIndex((c) => c.id === casoId)
  if (idx < 0) throw new ErroDeNegocio('Caso não encontrado.')
  try {
    const novo = aplicarAcao(banco.casos[idx], acao, banco.parametros)
    banco.casos[idx] = novo
    sincronizarNotificacao(banco, novo)
    return novo
  } catch (e) {
    throw new ErroDeNegocio((e as Error).message)
  }
}

/** Cria a notificação quando o caso se torna notificável (idempotente). */
export function sincronizarNotificacao(banco: Banco, caso: Caso) {
  if (banco.notificacoes.some((n) => n.casoId === caso.id)) return
  if (caso.desfecho?.tipo === 'descartado') return
  const cls = classificarNotificacao(caso)
  if (!cls) return
  banco.notificacoes.push({
    id: novoId('ntf'),
    casoId: caso.id,
    ubsId: caso.ubsId,
    agravoNotificacao: cls.agravoNotificacao,
    destino: cls.destino,
    criadaEm: cls.desde,
    prazo: prazoNotificacao(cls, banco.parametros),
    status: 'pendente',
  })
}

const MOTIVO_CLINICO: Record<string, (agravo: Agravo) => string> = {
  coleta: (a) => `Não compareceu para coleta do confirmatório (${AGRAVO_ROTULO[a]})`,
  inicio_tratamento: (a) => `Não iniciou o tratamento (${AGRAVO_ROTULO[a]})`,
  dose: () => 'Dose de benzilpenicilina em atraso',
  vdrl: () => 'VDRL de seguimento em atraso',
}

/**
 * Busca ativa: cria tarefa para pendências presenciais vencidas além da tolerância
 * e conclui automaticamente as tarefas cuja pendência foi resolvida.
 */
export function sincronizarBuscaAtiva(banco: Banco, hoje: ISODate) {
  const notifPorCaso = new Map(banco.notificacoes.map((n) => [n.casoId, n]))
  const pessoas = new Map(banco.pessoas.map((p) => [p.id, p]))
  const ativas = new Set<string>()

  for (const caso of banco.casos) {
    if (caso.desfecho) continue
    const pend = pendenciasParaBuscaAtiva(
      pendenciasDoCaso(caso, banco.parametros, hoje, notifPorCaso.get(caso.id)),
      banco.parametros,
    )
    for (const p of pend) {
      const chave = `${caso.id}:${p.chave}`
      ativas.add(chave)
      const existe = banco.tarefas.some((t) => t.casoId === caso.id && t.chavePendencia === p.chave)
      if (existe) continue
      banco.tarefas.push({
        id: novoId('bsc'),
        casoId: caso.id,
        pessoaId: caso.pessoaId,
        ubsId: caso.ubsId,
        microareaId: pessoas.get(caso.pessoaId)?.microareaId,
        motivo: (MOTIVO_CLINICO[p.tipo] ?? (() => p.descricao))(caso.agravo),
        chavePendencia: p.chave,
        criadaEm: somarDias(p.prazo, banco.parametros.toleranciaBuscaAtivaDias + 1),
        status: 'aberta',
        tentativas: [],
      })
    }
  }
  for (const t of banco.tarefas) {
    if (t.status === 'aberta' && !ativas.has(`${t.casoId}:${t.chavePendencia}`)) {
      t.status = 'concluida'
      t.concluidaEm = hoje
    }
  }
}
