import { compressToUTF16, decompressFromUTF16 } from 'lz-string'
import { hojeISO } from '@/lib/datas'
import { VERSAO_BANCO, type Banco } from './banco'
import { hidratarTestagem, sincronizarBuscaAtiva } from './operacoes'
import { gerarBancoDemo } from './seed'

const CHAVE = 'testagem-ubs:banco:lz'
let banco: Banco | null = null
let timer: ReturnType<typeof setTimeout> | undefined

function lerArmazenado(): Banco | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return null
    const dados = JSON.parse(decompressFromUTF16(bruto) ?? 'null') as Banco | null
    if (!dados) return null
    if (dados.versao !== VERSAO_BANCO) return null
    dados.testagens = dados.testagens.map(hidratarTestagem)
    return dados
  } catch {
    return null
  }
}

/**
 * Persiste sem as interpretações (derivadas) e comprimido (lz-string) para caber com folga
 * na cota do localStorage. Com o backend, este módulo deixa de existir.
 */
function gravarAgora() {
  timer = undefined
  if (!banco) return
  try {
    const enxuto = { ...banco, testagens: banco.testagens.map((t) => ({ ...t, interpretacoes: [] })) }
    localStorage.setItem(CHAVE, compressToUTF16(JSON.stringify(enxuto)))
  } catch {
    // Sem armazenamento (modo privado, cota): o sistema segue em memória.
  }
}

/** Agenda a gravação (agrupa várias escritas seguidas) e garante gravação ao sair da página. */
export function persistir() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(gravarAgora, 400)
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => timer && gravarAgora())
}

export function obterBanco(): Banco {
  if (!banco) {
    banco = lerArmazenado() ?? gerarBancoDemo()
    sincronizarBuscaAtiva(banco, hojeISO())
    persistir()
  }
  return banco
}

export function recriarBancoDemo(): Banco {
  banco = gerarBancoDemo()
  sincronizarBuscaAtiva(banco, hojeISO())
  gravarAgora()
  return banco
}
