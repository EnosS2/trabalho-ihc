import { diasEntre, somarDias } from '@/lib/datas'
import type {
  Agravo,
  Caso,
  Confirmatorio,
  Desfecho,
  ISODate,
  InterpretacaoAgravo,
  Notificacao,
  Parametros,
  ResultadoConfirmatorio,
  StatusCaso,
  Tratamento,
} from '../types'

export const ESQUEMA_SIFILIS =
  'Benzilpenicilina benzatina 2.400.000 UI IM, 3 doses semanais (total 7.200.000 UI)'

export function tratamentoPadrao(agravo: Agravo): Omit<Tratamento, 'doses'> {
  switch (agravo) {
    case 'sifilis':
      return { esquema: ESQUEMA_SIFILIS, local: 'ubs' }
    case 'hiv':
      return { esquema: 'TARV com vinculação ao SAE', local: 'servico_especializado' }
    case 'hepatite_b':
      return { esquema: 'Avaliação e tratamento no serviço especializado', local: 'servico_especializado' }
    case 'hepatite_c':
      return { esquema: 'Antivirais de ação direta no serviço especializado', local: 'servico_especializado' }
  }
}

export function programarDosesSifilis(inicio: ISODate, intervalo: number, aplicarPrimeira: boolean) {
  return [1, 2, 3].map((numero) => ({
    numero,
    previstaEm: somarDias(inicio, (numero - 1) * intervalo),
    aplicadaEm: numero === 1 && aplicarPrimeira ? inicio : undefined,
  }))
}

export interface NovoCasoInput {
  id: string
  pessoaId: string
  ubsId: string
  testagemId: string
  data: ISODate
  gestante: boolean
  responsavelId: string
  interpretacao: InterpretacaoAgravo
  /** Gestante com sífilis: executor confirma que aplicou a 1ª dose no ato. */
  primeiraDoseAplicada?: boolean
}

/** Cria o caso de seguimento a partir da interpretação do fluxograma. */
export function criarCaso(input: NovoCasoInput, params: Parametros): Caso {
  const { interpretacao: i } = input
  let confirmatorio: Confirmatorio
  let tratamento: Tratamento | undefined

  switch (i.agravo) {
    case 'hiv':
      if (i.conclusao === 'reagente') {
        confirmatorio = {
          exame: 'Fluxograma com dois testes rápidos (TR1 + TR2)',
          dispensado: true,
          resultado: 'confirmado',
          resultadoEm: input.data,
        }
      } else {
        confirmatorio = { exame: 'Amostra venosa (imunoensaio laboratorial)' }
      }
      break
    case 'sifilis':
      confirmatorio = { exame: 'VDRL (não treponêmico)' }
      if (input.gestante) {
        tratamento = {
          ...tratamentoPadrao('sifilis'),
          iniciadoEm: input.primeiraDoseAplicada ? input.data : undefined,
          doses: programarDosesSifilis(
            input.data,
            params.intervaloDoseSifilisDias,
            Boolean(input.primeiraDoseAplicada),
          ),
        }
      }
      break
    case 'hepatite_b':
      confirmatorio = { exame: 'HBV-DNA / marcadores sorológicos' }
      break
    case 'hepatite_c':
      confirmatorio = { exame: 'HCV-RNA (carga viral)' }
      break
  }

  return {
    id: input.id,
    pessoaId: input.pessoaId,
    agravo: i.agravo,
    ubsId: input.ubsId,
    testagemId: input.testagemId,
    abertoEm: input.data,
    gestante: input.gestante,
    confirmatorio,
    tratamento,
    seguimento: [],
    parcerias: [],
    responsavelId: input.responsavelId,
    anotacoes: [],
  }
}

export function tratamentoIniciado(caso: Caso): boolean {
  return Boolean(caso.tratamento?.iniciadoEm)
}

export function dosesAplicadas(caso: Caso): number {
  return caso.tratamento?.doses.filter((d) => d.aplicadaEm).length ?? 0
}

export function tratamentoConcluido(caso: Caso): boolean {
  const t = caso.tratamento
  if (!t?.iniciadoEm) return false
  if (t.doses.length === 0) return true
  return t.doses.every((d) => d.aplicadaEm)
}

/** O status é derivado dos dados — nunca armazenado — para não ficar inconsistente. */
export function derivarStatus(caso: Caso): StatusCaso {
  if (caso.desfecho) return 'encerrado'
  if (tratamentoIniciado(caso)) {
    if (caso.agravo === 'sifilis' && tratamentoConcluido(caso)) return 'em_seguimento'
    return 'em_tratamento'
  }
  const c = caso.confirmatorio
  if (c.resultado === 'confirmado') return 'aguardando_tratamento'
  if (caso.tratamento && caso.gestante) return 'aguardando_tratamento'
  if (!c.coletadoEm) return 'aguardando_coleta'
  return 'aguardando_resultado'
}

/**
 * Trilha do caso, na ordem do cuidado: teste rápido → confirmação → tratamento → seguimento
 * sorológico (só sífilis) → desfecho. `atual` é o índice da etapa em andamento; num caso encerrado
 * é `etapas.length` (todas concluídas). O teste rápido já está feito quando o caso nasce.
 */
export function etapasDoCaso(agravo: Agravo, status: StatusCaso): { etapas: string[]; atual: number } {
  const etapas = ['Teste rápido', 'Confirmação', 'Tratamento', ...(agravo === 'sifilis' ? ['Seguimento sorológico'] : []), 'Desfecho']
  const atual =
    status === 'encerrado'
      ? etapas.length
      : status === 'aguardando_coleta' || status === 'aguardando_resultado'
        ? 1
        : status === 'aguardando_tratamento' || status === 'em_tratamento'
          ? 2
          : 3
  return { etapas, atual }
}

// ---------- Pendências e prazos ----------

export type TipoPendencia =
  | 'coleta'
  | 'resultado'
  | 'inicio_tratamento'
  | 'dose'
  | 'vdrl'
  | 'parceria'
  | 'notificacao'

export interface Pendencia {
  chave: string
  casoId: string
  tipo: TipoPendencia
  descricao: string
  prazo: ISODate
  diasRestantes: number
  vencida: boolean
  /** Exige que a pessoa compareça à UBS (candidata a busca ativa). */
  requerPresenca: boolean
}

export function proximoVdrl(caso: Caso, params: Parametros): ISODate | undefined {
  if (caso.agravo !== 'sifilis' || !tratamentoConcluido(caso) || caso.desfecho) return undefined
  const ultimaDose = caso.tratamento!.doses.at(-1)?.aplicadaEm ?? caso.tratamento!.iniciadoEm!
  const ultimoExame = caso.seguimento.map((s) => s.data).sort().at(-1)
  const referencia = ultimoExame && ultimoExame > ultimaDose ? ultimoExame : ultimaDose
  const intervalo = caso.gestante ? params.seguimentoVdrlGestanteDias : params.seguimentoVdrlDias
  return somarDias(referencia, intervalo)
}

export function pendenciasDoCaso(
  caso: Caso,
  params: Parametros,
  hoje: ISODate,
  notificacao?: Notificacao,
): Pendencia[] {
  if (caso.desfecho) return []
  const lista: Omit<Pendencia, 'diasRestantes' | 'vencida' | 'casoId'>[] = []
  const c = caso.confirmatorio

  if (!c.dispensado && !c.coletadoEm) {
    lista.push({
      chave: 'coleta',
      tipo: 'coleta',
      descricao: `Coletar ${c.exame}`,
      prazo: somarDias(caso.abertoEm, params.prazoColetaConfirmatorioDias),
      requerPresenca: true,
    })
  }
  if (c.coletadoEm && !c.resultado) {
    lista.push({
      chave: 'resultado',
      tipo: 'resultado',
      descricao: `Registrar resultado: ${c.exame}`,
      prazo: somarDias(c.coletadoEm, params.prazoResultadoConfirmatorioDias),
      requerPresenca: false,
    })
  }

  const t = caso.tratamento
  const precisaTratar = c.resultado === 'confirmado' || (caso.agravo === 'sifilis' && caso.gestante)
  if (precisaTratar && !t?.iniciadoEm) {
    const imediato = caso.agravo === 'sifilis' && caso.gestante
    lista.push({
      chave: 'inicio_tratamento',
      tipo: 'inicio_tratamento',
      descricao:
        caso.agravo === 'sifilis'
          ? 'Aplicar 1ª dose de benzilpenicilina benzatina'
          : caso.agravo === 'hiv'
            ? 'Vincular ao SAE e iniciar TARV'
            : 'Encaminhar e confirmar início do tratamento',
      prazo: imediato
        ? caso.abertoEm
        : somarDias(c.resultadoEm ?? caso.abertoEm, params.prazoInicioTratamentoDias),
      requerPresenca: true,
    })
  }
  if (t?.iniciadoEm) {
    const proxima = t.doses.find((d) => !d.aplicadaEm)
    if (proxima) {
      lista.push({
        chave: `dose-${proxima.numero}`,
        tipo: 'dose',
        descricao: `Aplicar ${proxima.numero}ª dose de benzilpenicilina`,
        prazo: proxima.previstaEm,
        requerPresenca: true,
      })
    }
  }

  const vdrl = proximoVdrl(caso, params)
  if (vdrl) {
    lista.push({
      chave: `vdrl-${vdrl}`,
      tipo: 'vdrl',
      descricao: caso.gestante ? 'VDRL mensal de seguimento (gestante)' : 'VDRL trimestral de seguimento',
      prazo: vdrl,
      requerPresenca: true,
    })
  }

  if (caso.agravo === 'sifilis' && caso.gestante) {
    const semTratamento = caso.parcerias.filter((p) => !p.tratada)
    if (caso.parcerias.length === 0 || semTratamento.length > 0) {
      lista.push({
        chave: 'parceria',
        tipo: 'parceria',
        descricao:
          caso.parcerias.length === 0
            ? 'Registrar e convocar parceria sexual'
            : `Tratar parceria: ${semTratamento.map((p) => p.nome).join(', ')}`,
        prazo: somarDias(caso.abertoEm, params.prazoInicioTratamentoDias),
        requerPresenca: false,
      })
    }
  }

  if (notificacao && notificacao.status === 'pendente') {
    lista.push({
      chave: 'notificacao',
      tipo: 'notificacao',
      descricao: 'Enviar notificação compulsória',
      prazo: notificacao.prazo,
      requerPresenca: false,
    })
  }

  return lista
    .map((p) => {
      const diasRestantes = diasEntre(hoje, p.prazo)
      return { ...p, casoId: caso.id, diasRestantes, vencida: diasRestantes < 0 }
    })
    .sort((a, b) => a.prazo.localeCompare(b.prazo))
}

/** Pendências vencidas além da tolerância que exigem a presença da pessoa → busca ativa. */
export function pendenciasParaBuscaAtiva(pendencias: Pendencia[], params: Parametros): Pendencia[] {
  return pendencias.filter((p) => p.requerPresenca && p.diasRestantes < -params.toleranciaBuscaAtivaDias)
}

// ---------- Ações sobre o caso (reducer puro) ----------

export type AcaoCaso =
  | { tipo: 'registrar_coleta'; data: ISODate }
  | { tipo: 'registrar_resultado'; data: ISODate; resultado: ResultadoConfirmatorio; titulo?: string }
  | { tipo: 'iniciar_tratamento'; data: ISODate; esquema?: string; local?: Tratamento['local'] }
  | { tipo: 'aplicar_dose'; numero: number; data: ISODate }
  | { tipo: 'registrar_seguimento'; id: string; data: ISODate; exame: string; resultado: string }
  | { tipo: 'adicionar_parceria'; id: string; nome: string }
  | { tipo: 'atualizar_parceria'; id: string; testada: boolean; tratada: boolean }
  | { tipo: 'encerrar'; desfecho: Desfecho }
  | { tipo: 'anotar'; id: string; data: ISODate; autorId: string; texto: string }

export class AcaoInvalidaError extends Error {}

export function aplicarAcao(caso: Caso, acao: AcaoCaso, params: Parametros): Caso {
  if (caso.desfecho && acao.tipo !== 'anotar') {
    throw new AcaoInvalidaError('Caso encerrado não pode ser alterado.')
  }
  const novo: Caso = structuredClone(caso)

  switch (acao.tipo) {
    case 'registrar_coleta':
      if (acao.data < caso.abertoEm) throw new AcaoInvalidaError('A coleta não pode ser anterior à abertura do caso.')
      novo.confirmatorio.coletadoEm = acao.data
      break

    case 'registrar_resultado':
      if (!caso.confirmatorio.coletadoEm) throw new AcaoInvalidaError('Registre a coleta antes do resultado.')
      if (acao.data < caso.confirmatorio.coletadoEm) {
        throw new AcaoInvalidaError('O resultado não pode ser anterior à coleta.')
      }
      novo.confirmatorio.resultado = acao.resultado
      novo.confirmatorio.resultadoEm = acao.data
      novo.confirmatorio.titulo = acao.titulo || undefined
      if (acao.titulo && caso.agravo === 'sifilis') {
        novo.seguimento.push({ id: `${caso.id}-base`, data: acao.data, exame: 'VDRL', resultado: acao.titulo })
      }
      // Descartado sem tratamento em curso encerra o caso automaticamente.
      if (acao.resultado === 'descartado' && !tratamentoIniciado(caso)) {
        novo.desfecho = { tipo: 'descartado', data: acao.data }
      }
      break

    case 'iniciar_tratamento': {
      const padrao = tratamentoPadrao(caso.agravo)
      const esquema = acao.esquema || novo.tratamento?.esquema || padrao.esquema
      const local = acao.local ?? novo.tratamento?.local ?? padrao.local
      const doses =
        caso.agravo === 'sifilis'
          ? programarDosesSifilis(acao.data, params.intervaloDoseSifilisDias, true)
          : []
      novo.tratamento = { esquema, local, iniciadoEm: acao.data, doses }
      break
    }

    case 'aplicar_dose': {
      const dose = novo.tratamento?.doses.find((d) => d.numero === acao.numero)
      if (!dose) throw new AcaoInvalidaError('Dose não programada.')
      const anterior = novo.tratamento!.doses.find((d) => d.numero === acao.numero - 1)
      if (anterior && !anterior.aplicadaEm) throw new AcaoInvalidaError('Aplique as doses na ordem.')
      dose.aplicadaEm = acao.data
      if (acao.numero === 1) novo.tratamento!.iniciadoEm = acao.data
      // Intervalo > 14 dias entre doses exige reiniciar o esquema (PCDT IST).
      if (anterior?.aplicadaEm && diasEntre(anterior.aplicadaEm, acao.data) > 14) {
        throw new AcaoInvalidaError(
          'Intervalo maior que 14 dias entre doses: o esquema deve ser reiniciado (PCDT IST).',
        )
      }
      // Reprograma as próximas doses a partir da data real de aplicação.
      for (const d of novo.tratamento!.doses) {
        if (d.numero > acao.numero && !d.aplicadaEm) {
          d.previstaEm = somarDias(acao.data, (d.numero - acao.numero) * params.intervaloDoseSifilisDias)
        }
      }
      break
    }

    case 'registrar_seguimento':
      novo.seguimento.push({ id: acao.id, data: acao.data, exame: acao.exame, resultado: acao.resultado })
      novo.seguimento.sort((a, b) => a.data.localeCompare(b.data))
      break

    case 'adicionar_parceria':
      novo.parcerias.push({ id: acao.id, nome: acao.nome, testada: false, tratada: false })
      break

    case 'atualizar_parceria': {
      const p = novo.parcerias.find((x) => x.id === acao.id)
      if (!p) throw new AcaoInvalidaError('Parceria não encontrada.')
      p.testada = acao.testada
      p.tratada = acao.tratada
      break
    }

    case 'encerrar':
      novo.desfecho = acao.desfecho
      break

    case 'anotar':
      novo.anotacoes.push({ id: acao.id, data: acao.data, autorId: acao.autorId, texto: acao.texto })
      break
  }
  return novo
}

/** Queda de títulos: "1:32" → 32. */
export function tituloParaNumero(titulo: string): number | undefined {
  const m = titulo.match(/1\s*:\s*(\d+)/)
  return m ? Number(m[1]) : undefined
}

/** Resposta ao tratamento: queda de 2 diluições (4×) em até 6 meses (PCDT IST). */
export function avaliarRespostaSorologica(caso: Caso): 'adequada' | 'aguardando' | 'atencao' | undefined {
  if (caso.agravo !== 'sifilis' || !caso.tratamento?.iniciadoEm) return undefined
  const titulos = caso.seguimento
    .map((s) => ({ data: s.data, valor: tituloParaNumero(s.resultado) }))
    .filter((s): s is { data: ISODate; valor: number } => s.valor !== undefined)
  if (titulos.length < 2) return 'aguardando'
  const inicial = titulos[0].valor
  const atual = titulos.at(-1)!
  if (atual.valor * 4 <= inicial || atual.valor <= 1) return 'adequada'
  if (atual.valor > inicial * 2) return 'atencao' // aumento de 2 diluições: reinfecção/falha
  if (diasEntre(caso.tratamento.iniciadoEm, atual.data) > 180) return 'atencao'
  return 'aguardando'
}
