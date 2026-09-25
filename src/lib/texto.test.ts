import { describe, expect, it } from 'vitest'
import { plural } from './texto'

describe('plural', () => {
  it('usa o singular só para 1', () => {
    expect(plural(1, 'caso')).toBe('1 caso')
    expect(plural(0, 'caso')).toBe('0 casos')
    expect(plural(3, 'caso')).toBe('3 casos')
  })
  it('aceita plural irregular e formata milhar', () => {
    expect(plural(2, 'notificação', 'notificações')).toBe('2 notificações')
    expect(plural(1200, 'testagem', 'testagens')).toBe('1.200 testagens')
  })
})
