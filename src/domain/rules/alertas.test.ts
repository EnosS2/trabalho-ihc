import { describe, expect, it } from 'vitest'
import { montarAlertas } from './alertas'
import type { AlertaEstoque } from './estoque'

const vencido: AlertaEstoque = {
  id: 'vencido-l1',
  tipo: 'vencido',
  tipoTeste: 'hiv_tr1',
  loteId: 'l1',
  severidade: 'alta',
  mensagem: 'HIV (TR1), lote L1: venceu com 3 unidades no estoque.',
}
const baixo: AlertaEstoque = {
  id: 'baixo-sifilis_tr',
  tipo: 'estoque_baixo',
  tipoTeste: 'sifilis_tr',
  severidade: 'media',
  mensagem: 'Sífilis: 4 unidades, abaixo do mínimo de 20.',
}

describe('alertas do sino', () => {
  it('sem fontes (perfil sem acesso) não há alertas', () => {
    expect(montarAlertas({})).toEqual([])
  })

  it('conta pendências vencidas e do dia, com plural correto', () => {
    const alertas = montarAlertas({
      pendencias: [
        { vencida: true, diasRestantes: -3 },
        { vencida: true, diasRestantes: -1 },
        { vencida: false, diasRestantes: 0 },
        { vencida: false, diasRestantes: 5 },
      ],
    })
    expect(alertas.map((a) => a.texto)).toEqual(['2 pendências vencidas no seguimento', '1 pendência vence hoje'])
    expect(alertas[0].grave).toBe(true)
    expect(alertas[1].destino).toEqual({ tela: 'pendencias', janela: 'hoje' })
  })

  it('notificação só é grave se alguma está fora do prazo', () => {
    expect(montarAlertas({ notificacoes: { pendentes: 2, atrasadas: 0 } })[0]).toMatchObject({ grave: false, detalhe: 'todas dentro do prazo' })
    expect(montarAlertas({ notificacoes: { pendentes: 2, atrasadas: 1 } })[0]).toMatchObject({ grave: true, detalhe: '1 fora do prazo' })
    expect(montarAlertas({ notificacoes: { pendentes: 0, atrasadas: 0 } })).toEqual([])
  })

  it('lote vencido traz o lote para dar baixa; os outros alertas de estoque não', () => {
    const [a, b] = montarAlertas({ estoque: [vencido, baixo] })
    expect(a.loteParaBaixa).toBe('l1')
    expect(b.loteParaBaixa).toBeUndefined()
  })

  it('graves primeiro, mantendo a ordem do trabalho dentro da gravidade', () => {
    const alertas = montarAlertas({
      pendencias: [{ vencida: false, diasRestantes: 0 }],
      notificacoes: { pendentes: 1, atrasadas: 1 },
      estoque: [baixo, vencido],
      buscaAtivaAbertas: 4,
    })
    expect(alertas.map((a) => a.id)).toEqual(['notificacoes', 'estoque-vencido-l1', 'pendencias-hoje', 'estoque-baixo-sifilis_tr', 'busca-ativa'])
  })
})
