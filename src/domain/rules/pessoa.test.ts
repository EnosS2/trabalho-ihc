import { describe, expect, it } from 'vitest'
import { nomeDeExibicao, nomesPesquisaveis } from './pessoa'

describe('nome de exibição', () => {
  it('usa o nome social quando houver', () => {
    expect(nomeDeExibicao({ nome: 'João Silva', nomeSocial: 'Joana Silva' })).toBe('Joana Silva')
  })

  it('usa o nome civil sem nome social ou com nome social em branco', () => {
    expect(nomeDeExibicao({ nome: 'João Silva' })).toBe('João Silva')
    expect(nomeDeExibicao({ nome: 'João Silva', nomeSocial: '  ' })).toBe('João Silva')
  })

  it('busca encontra pelos dois nomes', () => {
    expect(nomesPesquisaveis({ nome: 'João Silva', nomeSocial: 'Joana Silva' })).toBe('João Silva Joana Silva')
    expect(nomesPesquisaveis({ nome: 'João Silva' })).toBe('João Silva')
  })
})
