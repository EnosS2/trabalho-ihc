import { describe, expect, it } from 'vitest'
import { interpretarAgravo, interpretarTestagem, testagemConcluida, type TesteExecutado } from './fluxograma'

const ctx = { gestante: false, exposicaoRecente: false }
const t = (tipo: TesteExecutado['tipo'], resultado: TesteExecutado['resultado'], ordem: number): TesteExecutado => ({
  tipo,
  resultado,
  ordem,
})

describe('fluxograma HIV', () => {
  it('pede TR1 quando nada foi feito', () => {
    const r = interpretarAgravo('hiv', [], ctx)
    expect(r.conclusao).toBe('incompleto')
    expect(r.proximoTeste).toBe('hiv_tr1')
  })

  it('TR1 não reagente conclui sem caso', () => {
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'nao_reagente', 1)], ctx)
    expect(r.conclusao).toBe('nao_reagente')
    expect(r.abreCaso).toBe(false)
    expect(r.proximoTeste).toBeUndefined()
  })

  it('alerta janela imunológica quando há exposição recente', () => {
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'nao_reagente', 1)], { ...ctx, exposicaoRecente: true })
    expect(r.condutas.join(' ')).toMatch(/janela imunológica/)
  })

  it('TR1 reagente exige TR2', () => {
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'reagente', 1)], ctx)
    expect(r.proximoTeste).toBe('hiv_tr2')
  })

  it('TR1 e TR2 reagentes estabelecem diagnóstico e abrem caso', () => {
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'reagente', 1), t('hiv_tr2', 'reagente', 2)], ctx)
    expect(r.conclusao).toBe('reagente')
    expect(r.abreCaso).toBe(true)
  })

  it('primeira discordância pede repetição; a segunda pede amostra venosa', () => {
    const uma = [t('hiv_tr1', 'reagente', 1), t('hiv_tr2', 'nao_reagente', 2)]
    const r1 = interpretarAgravo('hiv', uma, ctx)
    expect(r1.conclusao).toBe('discordante')
    expect(r1.proximoTeste).toBe('hiv_tr1')
    expect(r1.abreCaso).toBe(false)

    const duas = [...uma, t('hiv_tr1', 'reagente', 3), t('hiv_tr2', 'nao_reagente', 4)]
    const r2 = interpretarAgravo('hiv', duas, ctx)
    expect(r2.conclusao).toBe('discordante')
    expect(r2.proximoTeste).toBeUndefined()
    expect(r2.abreCaso).toBe(true)
  })

  it('TR inválido pede repetição do mesmo teste', () => {
    expect(interpretarAgravo('hiv', [t('hiv_tr1', 'invalido', 1)], ctx).proximoTeste).toBe('hiv_tr1')
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'reagente', 1), t('hiv_tr2', 'invalido', 2)], ctx)
    expect(r.proximoTeste).toBe('hiv_tr2')
  })

  it('usa o resultado mais recente após repetição de inválido', () => {
    const r = interpretarAgravo('hiv', [t('hiv_tr1', 'invalido', 1), t('hiv_tr1', 'nao_reagente', 2)], ctx)
    expect(r.conclusao).toBe('nao_reagente')
  })
})

describe('fluxograma sífilis', () => {
  it('reagente fora da gestação exige confirmatório e não é urgente', () => {
    const r = interpretarAgravo('sifilis', [t('sifilis_tr', 'reagente', 1)], ctx)
    expect(r.conclusao).toBe('reagente')
    expect(r.abreCaso).toBe(true)
    expect(r.urgente).toBe(false)
    expect(r.condutas.join(' ')).toMatch(/VDRL/)
  })

  it('gestante reagente: tratar no mesmo dia (Nota Técnica CAIST/SMS)', () => {
    const r = interpretarAgravo('sifilis', [t('sifilis_tr', 'reagente', 1)], { ...ctx, gestante: true })
    expect(r.urgente).toBe(true)
    expect(r.condutas[0]).toMatch(/Aplicar hoje/)
  })
})

describe('fluxograma hepatites', () => {
  it('HBsAg reagente abre caso', () => {
    expect(interpretarAgravo('hepatite_b', [t('hbsag_tr', 'reagente', 1)], ctx).abreCaso).toBe(true)
  })
  it('anti-HCV reagente pede carga viral', () => {
    expect(interpretarAgravo('hepatite_c', [t('anti_hcv_tr', 'reagente', 1)], ctx).condutas[0]).toMatch(/HCV-RNA/)
  })
})

describe('testagem', () => {
  it('só conclui quando nenhum agravo exige teste adicional', () => {
    const parcial = interpretarTestagem(['hiv', 'sifilis'], [t('hiv_tr1', 'reagente', 1), t('sifilis_tr', 'nao_reagente', 2)], ctx)
    expect(testagemConcluida(parcial)).toBe(false)
    const total = interpretarTestagem(
      ['hiv', 'sifilis'],
      [t('hiv_tr1', 'reagente', 1), t('sifilis_tr', 'nao_reagente', 2), t('hiv_tr2', 'reagente', 3)],
      ctx,
    )
    expect(testagemConcluida(total)).toBe(true)
  })
})
