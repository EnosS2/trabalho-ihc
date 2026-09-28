import { describe, expect, it } from 'vitest'
import { dataBrParaIso, isoParaDataBr, mascararData } from './datas'

describe('datas no formato brasileiro', () => {
  it('aplica a máscara dd/mm/aaaa enquanto se digita', () => {
    expect(mascararData('0')).toBe('0')
    expect(mascararData('053')).toBe('05/3')
    expect(mascararData('05031990')).toBe('05/03/1990')
    expect(mascararData('05/03/19901')).toBe('05/03/1990')
    expect(mascararData('ab05-03')).toBe('05/03')
  })

  it('aceita colar data ISO', () => {
    expect(mascararData('1990-03-05')).toBe('05/03/1990')
  })

  it('converte só datas completas e existentes', () => {
    expect(dataBrParaIso('05/03/1990')).toBe('1990-03-05')
    expect(dataBrParaIso('29/02/2024')).toBe('2024-02-29')
    expect(dataBrParaIso('29/02/2023')).toBeNull()
    expect(dataBrParaIso('31/04/2026')).toBeNull()
    expect(dataBrParaIso('05/03/19')).toBeNull()
    expect(dataBrParaIso('01/01/1850')).toBeNull()
  })

  it('formata ISO para exibição no campo', () => {
    expect(isoParaDataBr('2026-09-28')).toBe('28/09/2026')
    expect(isoParaDataBr('')).toBe('')
  })
})
