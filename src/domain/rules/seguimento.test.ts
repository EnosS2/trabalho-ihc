import { describe, expect, it } from 'vitest'
import { PARAMETROS_PADRAO as P } from '../parametros'
import { interpretarAgravo } from './fluxograma'
import {
  aplicarAcao,
  avaliarRespostaSorologica,
  criarCaso,
  derivarStatus,
  pendenciasDoCaso,
  pendenciasParaBuscaAtiva,
} from './seguimento'

const base = { id: 'c1', pessoaId: 'p1', ubsId: 'u1', testagemId: 't1', data: '2026-01-10', responsavelId: 'x' }

function casoSifilis(gestante: boolean, primeiraDoseAplicada = false) {
  const interpretacao = interpretarAgravo('sifilis', [{ tipo: 'sifilis_tr', resultado: 'reagente', ordem: 1 }], {
    gestante,
    exposicaoRecente: false,
  })
  return criarCaso({ ...base, gestante, interpretacao, primeiraDoseAplicada }, P)
}

describe('ciclo do caso de sífilis adquirida', () => {
  it('percorre coleta → resultado → tratamento → seguimento → encerramento', () => {
    let c = casoSifilis(false)
    expect(derivarStatus(c)).toBe('aguardando_coleta')

    c = aplicarAcao(c, { tipo: 'registrar_coleta', data: '2026-01-12' }, P)
    expect(derivarStatus(c)).toBe('aguardando_resultado')

    c = aplicarAcao(c, { tipo: 'registrar_resultado', data: '2026-01-20', resultado: 'confirmado', titulo: '1:32' }, P)
    expect(derivarStatus(c)).toBe('aguardando_tratamento')
    expect(c.seguimento).toHaveLength(1)

    c = aplicarAcao(c, { tipo: 'iniciar_tratamento', data: '2026-01-21' }, P)
    expect(derivarStatus(c)).toBe('em_tratamento')
    expect(c.tratamento!.doses.map((d) => d.previstaEm)).toEqual(['2026-01-21', '2026-01-28', '2026-02-04'])

    c = aplicarAcao(c, { tipo: 'aplicar_dose', numero: 2, data: '2026-01-29' }, P)
    expect(c.tratamento!.doses[2].previstaEm).toBe('2026-02-05')
    c = aplicarAcao(c, { tipo: 'aplicar_dose', numero: 3, data: '2026-02-05' }, P)
    expect(derivarStatus(c)).toBe('em_seguimento')

    const vdrl = pendenciasDoCaso(c, P, '2026-02-06').find((p) => p.tipo === 'vdrl')
    expect(vdrl?.prazo).toBe('2026-05-06')

    c = aplicarAcao(c, { tipo: 'encerrar', desfecho: { tipo: 'tratamento_concluido', data: '2026-06-01' } }, P)
    expect(derivarStatus(c)).toBe('encerrado')
    expect(pendenciasDoCaso(c, P, '2026-06-02')).toEqual([])
  })

  it('confirmatório descartado encerra o caso', () => {
    let c = casoSifilis(false)
    c = aplicarAcao(c, { tipo: 'registrar_coleta', data: '2026-01-11' }, P)
    c = aplicarAcao(c, { tipo: 'registrar_resultado', data: '2026-01-15', resultado: 'descartado' }, P)
    expect(c.desfecho?.tipo).toBe('descartado')
  })

  it('impede resultado antes da coleta e doses fora de ordem', () => {
    const c = casoSifilis(false)
    expect(() =>
      aplicarAcao(c, { tipo: 'registrar_resultado', data: '2026-01-15', resultado: 'confirmado' }, P),
    ).toThrow(/coleta/)
    const t = aplicarAcao(c, { tipo: 'iniciar_tratamento', data: '2026-01-10' }, P)
    expect(() => aplicarAcao(t, { tipo: 'aplicar_dose', numero: 3, data: '2026-01-17' }, P)).toThrow(/ordem/)
  })

  it('exige reinício do esquema se intervalo entre doses > 14 dias', () => {
    const c = aplicarAcao(casoSifilis(false), { tipo: 'iniciar_tratamento', data: '2026-01-10' }, P)
    expect(() => aplicarAcao(c, { tipo: 'aplicar_dose', numero: 2, data: '2026-01-30' }, P)).toThrow(/reiniciado/)
  })
})

describe('gestante com sífilis', () => {
  it('com 1ª dose no ato, fica em tratamento e com doses programadas', () => {
    const c = casoSifilis(true, true)
    expect(derivarStatus(c)).toBe('em_tratamento')
    expect(c.tratamento!.iniciadoEm).toBe('2026-01-10')
    const tipos = pendenciasDoCaso(c, P, '2026-01-10').map((p) => p.tipo)
    expect(tipos).toEqual(expect.arrayContaining(['coleta', 'dose', 'parceria']))
  })

  it('sem dose no ato, pendência de tratamento vence no mesmo dia', () => {
    const c = casoSifilis(true, false)
    expect(derivarStatus(c)).toBe('aguardando_tratamento')
    const p = pendenciasDoCaso(c, P, '2026-01-15').find((x) => x.tipo === 'inicio_tratamento')!
    expect(p.prazo).toBe('2026-01-10')
    expect(p.vencida).toBe(true)
  })

  it('gera busca ativa só após a tolerância', () => {
    const c = casoSifilis(true, true)
    const dose2 = (hoje: string) =>
      pendenciasParaBuscaAtiva(pendenciasDoCaso(c, P, hoje), P).filter((p) => p.tipo === 'dose')
    expect(dose2('2026-01-19')).toHaveLength(0)
    expect(dose2('2026-01-21')).toHaveLength(1)
  })
})

describe('HIV', () => {
  it('reagente por dois TR já nasce confirmado e aguarda vinculação', () => {
    const interpretacao = interpretarAgravo(
      'hiv',
      [
        { tipo: 'hiv_tr1', resultado: 'reagente', ordem: 1 },
        { tipo: 'hiv_tr2', resultado: 'reagente', ordem: 2 },
      ],
      { gestante: false, exposicaoRecente: false },
    )
    const c = criarCaso({ ...base, gestante: false, interpretacao }, P)
    expect(c.confirmatorio.dispensado).toBe(true)
    expect(derivarStatus(c)).toBe('aguardando_tratamento')
    expect(pendenciasDoCaso(c, P, '2026-01-10').map((p) => p.tipo)).toEqual(['inicio_tratamento'])
  })
})

describe('resposta sorológica', () => {
  it('queda de 2 diluições é adequada', () => {
    let c = casoSifilis(false)
    c = aplicarAcao(c, { tipo: 'registrar_coleta', data: '2026-01-10' }, P)
    c = aplicarAcao(c, { tipo: 'registrar_resultado', data: '2026-01-12', resultado: 'confirmado', titulo: '1:32' }, P)
    c = aplicarAcao(c, { tipo: 'iniciar_tratamento', data: '2026-01-12' }, P)
    expect(avaliarRespostaSorologica(c)).toBe('aguardando')
    c = aplicarAcao(
      c,
      { tipo: 'registrar_seguimento', id: 's', data: '2026-04-12', exame: 'VDRL', resultado: '1:8' },
      P,
    )
    expect(avaliarRespostaSorologica(c)).toBe('adequada')
  })
})
