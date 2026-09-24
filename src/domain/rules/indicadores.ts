import { diasEntre, mesDe } from '@/lib/datas'
import { AGRAVOS } from '../rotulos'
import type { Agravo, Caso, ISODate, Notificacao, Pessoa, Testagem } from '../types'
import { calcularCompletude } from './notificacao'
import { tratamentoConcluido, tratamentoIniciado } from './seguimento'

export interface Proporcao {
  num: number
  den: number
  /** 0–100, ou null quando não há denominador. */
  pct: number | null
}

function prop(num: number, den: number): Proporcao {
  return { num, den, pct: den > 0 ? Math.round((num / den) * 1000) / 10 : null }
}

function mediana(valores: number[]): number | null {
  if (valores.length === 0) return null
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

export interface IndicadorAgravo {
  agravo: Agravo
  testados: number
  reagentes: number
  positividade: Proporcao
}

export interface Indicadores {
  testagens: number
  pessoasTestadas: number
  gestantesTestadas: number
  porAgravo: IndicadorAgravo[]
  casosAbertos: number
  coletaNoPrazo: Proporcao
  medianaDiasConfirmacao: number | null
  tratamentoIniciado: Proporcao
  gestanteSifilisTratadaMesmoDia: Proporcao
  gestanteSifilisTratamentoCompleto: Proporcao
  notificacoesNoPrazo: Proporcao
  notificacoesCompletas: Proporcao
  perdaSeguimento: Proporcao
  serieMensal: { mes: string; testagens: number; reagentes: number }[]
}

export interface EntradaIndicadores {
  testagens: Testagem[]
  casos: Caso[]
  notificacoes: Notificacao[]
  pessoas: Map<string, Pessoa>
  inicio: ISODate
  fim: ISODate
  hoje: ISODate
  prazoColetaDias: number
}

export function calcularIndicadores(e: EntradaIndicadores): Indicadores {
  const noPeriodo = (d: ISODate) => d.slice(0, 10) >= e.inicio && d.slice(0, 10) <= e.fim
  const testagens = e.testagens.filter((t) => noPeriodo(t.data))
  const casos = e.casos.filter((c) => noPeriodo(c.abertoEm))
  const casoPorId = new Map(e.casos.map((c) => [c.id, c]))

  const porAgravo: IndicadorAgravo[] = AGRAVOS.map((agravo) => {
    const conclusivas = testagens
      .flatMap((t) => t.interpretacoes)
      .filter((i) => i.agravo === agravo && ['reagente', 'nao_reagente', 'discordante'].includes(i.conclusao))
    const reagentes = conclusivas.filter((i) => i.conclusao === 'reagente').length
    return { agravo, testados: conclusivas.length, reagentes, positividade: prop(reagentes, conclusivas.length) }
  })

  // Coleta do confirmatório no prazo (casos que exigem coleta e cujo prazo já passou ou já coletaram)
  const exigemColeta = casos.filter((c) => !c.confirmatorio.dispensado)
  const avaliaveis = exigemColeta.filter(
    (c) => c.confirmatorio.coletadoEm || diasEntre(c.abertoEm, e.hoje) > e.prazoColetaDias,
  )
  const coletaNoPrazo = prop(
    avaliaveis.filter(
      (c) => c.confirmatorio.coletadoEm && diasEntre(c.abertoEm, c.confirmatorio.coletadoEm) <= e.prazoColetaDias,
    ).length,
    avaliaveis.length,
  )

  const temposConfirmacao = exigemColeta
    .filter((c) => c.confirmatorio.resultadoEm)
    .map((c) => diasEntre(c.abertoEm, c.confirmatorio.resultadoEm!))

  const precisamTratar = casos.filter(
    (c) =>
      c.confirmatorio.resultado === 'confirmado' ||
      (c.agravo === 'sifilis' && c.gestante && c.desfecho?.tipo !== 'descartado'),
  )
  const gestSif = casos.filter((c) => c.agravo === 'sifilis' && c.gestante)

  const notifs = e.notificacoes.filter((n) => noPeriodo(n.criadaEm))
  const notifsAvaliaveis = notifs.filter((n) => n.status === 'enviada' || n.prazo < e.hoje)
  const completas = notifs.filter((n) => {
    const caso = casoPorId.get(n.casoId)
    const pessoa = caso && e.pessoas.get(caso.pessoaId)
    return caso && pessoa && calcularCompletude(pessoa, caso).percentual === 100
  })

  const encerrados = casos.filter((c) => c.desfecho && c.desfecho.tipo !== 'descartado')

  const meses = new Map<string, { testagens: number; reagentes: number }>()
  for (const t of testagens) {
    const m = mesDe(t.data)
    const atual = meses.get(m) ?? { testagens: 0, reagentes: 0 }
    atual.testagens += 1
    if (t.interpretacoes.some((i) => i.conclusao === 'reagente')) atual.reagentes += 1
    meses.set(m, atual)
  }

  return {
    testagens: testagens.length,
    pessoasTestadas: new Set(testagens.map((t) => t.pessoaId)).size,
    gestantesTestadas: new Set(testagens.filter((t) => t.gestante).map((t) => t.pessoaId)).size,
    porAgravo,
    casosAbertos: casos.length,
    coletaNoPrazo,
    medianaDiasConfirmacao: mediana(temposConfirmacao),
    tratamentoIniciado: prop(precisamTratar.filter(tratamentoIniciado).length, precisamTratar.length),
    gestanteSifilisTratadaMesmoDia: prop(
      gestSif.filter((c) => c.tratamento?.iniciadoEm === c.abertoEm).length,
      gestSif.length,
    ),
    gestanteSifilisTratamentoCompleto: prop(gestSif.filter(tratamentoConcluido).length, gestSif.length),
    notificacoesNoPrazo: prop(
      notifsAvaliaveis.filter((n) => n.status === 'enviada' && n.enviadaEm!.slice(0, 10) <= n.prazo).length,
      notifsAvaliaveis.length,
    ),
    notificacoesCompletas: prop(completas.length, notifs.length),
    perdaSeguimento: prop(
      encerrados.filter((c) => c.desfecho!.tipo === 'perda_seguimento').length,
      encerrados.length,
    ),
    serieMensal: [...meses.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, ...v })),
  }
}
