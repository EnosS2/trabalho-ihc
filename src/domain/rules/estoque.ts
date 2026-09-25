import { diasEntre, mesDe, somarDias } from '@/lib/datas'
import { TIPO_TESTE_ROTULO, TIPOS_TESTE } from '../rotulos'
import { plural } from '@/lib/texto'
import type { ISODate, LoteInsumo, MovimentacaoEstoque, Parametros, Testagem, TipoTeste } from '../types'

export function loteVencido(lote: LoteInsumo, hoje: ISODate): boolean {
  return lote.validade < hoje
}

export function loteUtilizavel(lote: LoteInsumo, hoje: ISODate): boolean {
  return lote.quantidadeAtual > 0 && !loteVencido(lote, hoje)
}

/** FEFO — first expired, first out: usa primeiro o lote que vence antes. */
export function selecionarLoteFEFO(lotes: LoteInsumo[], tipo: TipoTeste, hoje: ISODate): LoteInsumo | undefined {
  return lotes
    .filter((l) => l.tipo === tipo && loteUtilizavel(l, hoje))
    .sort((a, b) => a.validade.localeCompare(b.validade) || a.recebidoEm.localeCompare(b.recebidoEm))[0]
}

export function saldoUtilizavel(lotes: LoteInsumo[], tipo: TipoTeste, hoje: ISODate): number {
  return lotes.filter((l) => l.tipo === tipo && loteUtilizavel(l, hoje)).reduce((s, l) => s + l.quantidadeAtual, 0)
}

export function consumoMedioDiario(
  movs: MovimentacaoEstoque[],
  lotes: LoteInsumo[],
  tipo: TipoTeste,
  hoje: ISODate,
  janelaDias = 30,
): number {
  const inicio = somarDias(hoje, -janelaDias)
  const idsDoTipo = new Set(lotes.filter((l) => l.tipo === tipo).map((l) => l.id))
  const total = movs
    .filter((m) => m.tipo === 'consumo' && idsDoTipo.has(m.loteId) && m.data.slice(0, 10) > inicio)
    .reduce((s, m) => s - m.quantidade, 0)
  return total / janelaDias
}

export interface ResumoTipo {
  tipo: TipoTeste
  saldo: number
  consumoDiario: number
  /** Dias de cobertura com o consumo atual; `null` quando não há consumo. */
  coberturaDias: number | null
  minimo: number
  proximaValidade?: ISODate
}

export function resumoPorTipo(
  lotes: LoteInsumo[],
  movs: MovimentacaoEstoque[],
  params: Parametros,
  hoje: ISODate,
): ResumoTipo[] {
  return TIPOS_TESTE.map((tipo) => {
    const saldo = saldoUtilizavel(lotes, tipo, hoje)
    const consumoDiario = consumoMedioDiario(movs, lotes, tipo, hoje)
    return {
      tipo,
      saldo,
      consumoDiario,
      coberturaDias: consumoDiario > 0 ? Math.floor(saldo / consumoDiario) : null,
      minimo: params.estoqueMinimo[tipo],
      proximaValidade: selecionarLoteFEFO(lotes, tipo, hoje)?.validade,
    }
  })
}

export type TipoAlertaEstoque = 'vencido' | 'vencendo' | 'estoque_baixo' | 'sem_estoque'

export interface AlertaEstoque {
  id: string
  tipo: TipoAlertaEstoque
  tipoTeste: TipoTeste
  loteId?: string
  severidade: 'alta' | 'media'
  mensagem: string
}

export function alertasEstoque(lotes: LoteInsumo[], params: Parametros, hoje: ISODate): AlertaEstoque[] {
  const alertas: AlertaEstoque[] = []
  for (const l of lotes) {
    if (l.quantidadeAtual <= 0) continue
    const dias = diasEntre(hoje, l.validade)
    if (dias < 0) {
      alertas.push({
        id: `vencido-${l.id}`,
        tipo: 'vencido',
        tipoTeste: l.tipo,
        loteId: l.id,
        severidade: 'alta',
        mensagem: `${TIPO_TESTE_ROTULO[l.tipo]}, lote ${l.lote}: venceu com ${plural(l.quantidadeAtual, 'unidade')}. Dê baixa no estoque.`,
      })
    } else if (dias <= params.alertaValidadeDias) {
      alertas.push({
        id: `vencendo-${l.id}`,
        tipo: 'vencendo',
        tipoTeste: l.tipo,
        loteId: l.id,
        severidade: 'media',
        mensagem: `${TIPO_TESTE_ROTULO[l.tipo]}, lote ${l.lote}: vence em ${plural(dias, 'dia')}, com ${plural(l.quantidadeAtual, 'unidade')}.`,
      })
    }
  }
  for (const tipo of TIPOS_TESTE) {
    const saldo = saldoUtilizavel(lotes, tipo, hoje)
    if (saldo === 0) {
      alertas.push({
        id: `sem-${tipo}`,
        tipo: 'sem_estoque',
        tipoTeste: tipo,
        severidade: 'alta',
        mensagem: `Sem estoque utilizável de ${TIPO_TESTE_ROTULO[tipo]}.`,
      })
    } else if (saldo < params.estoqueMinimo[tipo]) {
      alertas.push({
        id: `baixo-${tipo}`,
        tipo: 'estoque_baixo',
        tipoTeste: tipo,
        severidade: 'media',
        mensagem: `${TIPO_TESTE_ROTULO[tipo]}: ${plural(saldo, 'unidade')}, abaixo do mínimo de ${params.estoqueMinimo[tipo]}.`,
      })
    }
  }
  return alertas.sort((a, b) => (a.severidade === b.severidade ? 0 : a.severidade === 'alta' ? -1 : 1))
}

export interface LinhaFechamento {
  tipo: TipoTeste
  estoqueInicial: number
  entradas: number
  consumo: number
  perdas: number
  vencidos: number
  ajustes: number
  estoqueFinal: number
  reagentes: number
}

/** Fechamento mensal no formato do boletim do SISLOGLAB (quantitativos agregados por kit). */
export function fechamentoMensal(
  lotes: LoteInsumo[],
  movs: MovimentacaoEstoque[],
  testagens: Testagem[],
  mes: string,
): LinhaFechamento[] {
  const tipoDoLote = new Map(lotes.map((l) => [l.id, l.tipo]))
  return TIPOS_TESTE.map((tipo) => {
    const doTipo = movs.filter((m) => tipoDoLote.get(m.loteId) === tipo)
    const antes = doTipo.filter((m) => mesDe(m.data) < mes).reduce((s, m) => s + m.quantidade, 0)
    const noMes = doTipo.filter((m) => mesDe(m.data) === mes)
    const soma = (t: MovimentacaoEstoque['tipo']) =>
      noMes.filter((m) => m.tipo === t).reduce((s, m) => s + Math.abs(m.quantidade), 0)
    const ajustes = noMes.filter((m) => m.tipo === 'ajuste').reduce((s, m) => s + m.quantidade, 0)
    const entradas = soma('entrada')
    const consumo = soma('consumo')
    const perdas = soma('perda')
    const vencidos = soma('vencimento')
    const reagentes = testagens
      .filter((t) => mesDe(t.data) === mes)
      .flatMap((t) => t.testes)
      .filter((t) => t.tipo === tipo && t.resultado === 'reagente').length
    return {
      tipo,
      estoqueInicial: antes,
      entradas,
      consumo,
      perdas,
      vencidos,
      ajustes,
      estoqueFinal: antes + entradas - consumo - perdas - vencidos + ajustes,
      reagentes,
    }
  })
}

export function fechamentoParaCsv(linhas: LinhaFechamento[], cabecalho: { ubs: string; cnes: string; mes: string }) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const head = ['UBS', 'CNES', 'Mês', 'Insumo', 'Estoque inicial', 'Entradas', 'Testes realizados', 'Perdas', 'Vencidos', 'Ajustes', 'Estoque final', 'Reagentes']
  const rows = linhas.map((l) => [
    cabecalho.ubs,
    cabecalho.cnes,
    cabecalho.mes,
    TIPO_TESTE_ROTULO[l.tipo],
    l.estoqueInicial,
    l.entradas,
    l.consumo,
    l.perdas,
    l.vencidos,
    l.ajustes,
    l.estoqueFinal,
    l.reagentes,
  ])
  return [head, ...rows].map((r) => r.map(esc).join(';')).join('\r\n')
}
