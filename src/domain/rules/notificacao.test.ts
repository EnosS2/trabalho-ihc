import { describe, expect, it } from 'vitest'
import type { Caso, Pessoa } from '../types'
import { calcularCompletude, classificarNotificacao } from './notificacao'

const caso = (over: Partial<Caso>): Caso => ({
  id: 'c',
  pessoaId: 'p',
  agravo: 'sifilis',
  ubsId: 'u',
  testagemId: 't',
  abertoEm: '2026-01-10',
  gestante: false,
  confirmatorio: { exame: 'VDRL' },
  seguimento: [],
  parcerias: [],
  responsavelId: 'r',
  anotacoes: [],
  ...over,
})

const pessoa: Pessoa = {
  id: 'p',
  nome: 'Maria da Silva',
  cns: '700000000000005',
  dataNascimento: '1995-02-01',
  sexo: 'F',
  nomeMae: 'Ana da Silva',
  racaCor: 'parda',
  escolaridade: 'ignorado',
  telefone: '51999999999',
  endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro' },
  ubsId: 'u',
  gestante: false,
  criadoEm: '2026-01-01',
  atualizadoEm: '2026-01-01',
}

describe('classificação da notificação', () => {
  it('sífilis em gestante é notificável na abertura', () => {
    const r = classificarNotificacao(caso({ gestante: true }))
    expect(r).toEqual({ agravoNotificacao: 'sifilis_gestante', destino: 'sentinela', desde: '2026-01-10' })
  })

  it('sífilis adquirida só após confirmação', () => {
    expect(classificarNotificacao(caso({}))).toBeNull()
    const confirmado = caso({ confirmatorio: { exame: 'VDRL', resultado: 'confirmado', resultadoEm: '2026-01-20' } })
    expect(classificarNotificacao(confirmado)?.desde).toBe('2026-01-20')
  })

  it('gestante com HIV vai por e-mail à DVS', () => {
    const c = caso({
      agravo: 'hiv',
      gestante: true,
      confirmatorio: { exame: 'TR', resultado: 'confirmado', resultadoEm: '2026-01-10' },
    })
    expect(classificarNotificacao(c)?.destino).toBe('email_dvs')
  })
})

describe('completude', () => {
  it('escolaridade ignorada reduz a completude mas não bloqueia', () => {
    const r = calcularCompletude(pessoa, caso({ confirmatorio: { exame: 'VDRL', titulo: '1:8' } }))
    expect(r.pronta).toBe(true)
    expect(r.percentual).toBeLessThan(100)
    expect(r.campos.find((c) => c.campo === 'escolaridade')?.ignorado).toBe(true)
  })

  it('gestante sem DUM não está pronta', () => {
    const r = calcularCompletude({ ...pessoa, gestante: true }, caso({ gestante: true }))
    expect(r.pronta).toBe(false)
    expect(r.faltandoObrigatorios.map((c) => c.campo)).toContain('dum')
  })
})
