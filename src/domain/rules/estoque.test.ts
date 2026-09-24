import { describe, expect, it } from 'vitest'
import { PARAMETROS_PADRAO } from '../parametros'
import type { LoteInsumo, MovimentacaoEstoque } from '../types'
import { alertasEstoque, fechamentoMensal, selecionarLoteFEFO } from './estoque'

const lote = (id: string, validade: string, qtd: number, tipo: LoteInsumo['tipo'] = 'sifilis_tr'): LoteInsumo => ({
  id,
  ubsId: 'u',
  tipo,
  fabricante: 'F',
  lote: id.toUpperCase(),
  validade,
  recebidoEm: '2026-01-01',
  quantidadeInicial: qtd,
  quantidadeAtual: qtd,
})

let seq = 0
const mov = (tipo: MovimentacaoEstoque['tipo'], quantidade: number, data: string): MovimentacaoEstoque => ({
  id: String(seq++),
  loteId: 'a',
  ubsId: 'u',
  tipo,
  quantidade,
  data,
  usuarioId: 'x',
})

describe('estoque', () => {
  it('FEFO escolhe o lote válido que vence primeiro', () => {
    const lotes = [
      lote('a', '2026-12-01', 10),
      lote('b', '2026-03-01', 10),
      lote('c', '2026-01-05', 10),
      lote('d', '2026-02-01', 0),
    ]
    expect(selecionarLoteFEFO(lotes, 'sifilis_tr', '2026-01-10')?.id).toBe('b')
  })

  it('alerta vencido, vencendo e estoque baixo', () => {
    const lotes = [lote('a', '2026-01-05', 3), lote('b', '2026-01-25', 5)]
    const tipos = alertasEstoque(lotes, PARAMETROS_PADRAO, '2026-01-10').map((a) => `${a.tipo}:${a.tipoTeste}`)
    expect(tipos).toEqual(
      expect.arrayContaining([
        'vencido:sifilis_tr',
        'vencendo:sifilis_tr',
        'estoque_baixo:sifilis_tr',
        'sem_estoque:hiv_tr1',
      ]),
    )
  })

  it('fechamento mensal fecha a conta de estoque', () => {
    const lotes = [lote('a', '2027-01-01', 100)]
    const movs = [
      mov('entrada', 100, '2026-01-02'),
      mov('consumo', -10, '2026-01-20'),
      mov('consumo', -5, '2026-02-03'),
      mov('perda', -2, '2026-02-10'),
    ]
    const sif = fechamentoMensal(lotes, movs, [], '2026-02').find((l) => l.tipo === 'sifilis_tr')
    expect(sif).toMatchObject({ estoqueInicial: 90, consumo: 5, perdas: 2, estoqueFinal: 83 })
  })
})
