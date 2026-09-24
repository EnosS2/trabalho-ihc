import { describe, expect, it } from 'vitest'
import { gerarCnsProvisorio, gerarCpf, validarCns, validarCpf } from './documentos'

function prng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

describe('documentos', () => {
  it('valida CNS provisório gerado e rejeita inválido', () => {
    expect(validarCns('898 0010 0340 0007')).toBe(false)
    const r = prng(42)
    for (let i = 0; i < 50; i++) expect(validarCns(gerarCnsProvisorio(r))).toBe(true)
  })

  it('valida CPF', () => {
    expect(validarCpf('529.982.247-25')).toBe(true)
    expect(validarCpf('111.111.111-11')).toBe(false)
    expect(validarCpf('529.982.247-26')).toBe(false)
    const r = prng(7)
    for (let i = 0; i < 50; i++) expect(validarCpf(gerarCpf(r))).toBe(true)
  })
})
