import { describe, expect, it } from 'vitest'
import { derivarStatus } from '@/domain/rules/seguimento'
import { sincronizarBuscaAtiva } from './operacoes'
import { gerarBancoDemo, UBS_DEMO } from './seed'

describe('seed de demonstração', () => {
  const hoje = '2026-09-24'
  const banco = gerarBancoDemo(hoje)
  sincronizarBuscaAtiva(banco, hoje)

  it('é determinístico', () => {
    const outro = gerarBancoDemo(hoje)
    expect(outro.testagens.length).toBe(banco.testagens.length)
    expect(outro.casos.length).toBe(banco.casos.length)
  })

  it('nunca deixa estoque negativo e fecha saldo com movimentações', () => {
    for (const l of banco.lotes) {
      expect(l.quantidadeAtual).toBeGreaterThanOrEqual(0)
      const saldo = banco.movimentacoes.filter((m) => m.loteId === l.id).reduce((s, m) => s + m.quantidade, 0)
      expect(saldo).toBe(l.quantidadeAtual)
    }
  })

  it('tem casos em todas as etapas na UBS de demonstração', () => {
    const status = new Set(banco.casos.filter((c) => c.ubsId === UBS_DEMO).map(derivarStatus))
    expect([...status]).toEqual(
      expect.arrayContaining(['aguardando_coleta', 'aguardando_resultado', 'aguardando_tratamento', 'em_tratamento', 'em_seguimento', 'encerrado']),
    )
  })

  it('gera busca ativa para a microárea da ACS demo', () => {
    const tarefas = banco.tarefas.filter((t) => t.microareaId === `${UBS_DEMO}-ma01` && t.status === 'aberta')
    expect(tarefas.length).toBeGreaterThan(0)
  })

  it('cabe com folga no localStorage', () => {
    const tamanho = JSON.stringify({ ...banco, testagens: banco.testagens.map((t) => ({ ...t, interpretacoes: [] })) }).length
    console.info(`seed: ${banco.pessoas.length} pessoas, ${banco.testagens.length} testagens, ${banco.casos.length} casos, ${(tamanho / 1024).toFixed(0)} KB`)
    expect(tamanho).toBeLessThan(2_500_000)
  })
})
