import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Estado de filtro, aba ou visão guardado na URL (?chave=valor). Ao abrir um detalhe e voltar,
 * a tela reaparece como estava; o endereço pode ser compartilhado; e a troca usa `replace`,
 * para não encher o histórico a cada letra digitada. O valor padrão não aparece na URL.
 * `validos` descarta valores desconhecidos (URL editada à mão ou antiga).
 */
export function useEstadoNaUrl<T extends string = string>(
  chave: string,
  padrao: NoInfer<T>,
  validos?: readonly NoInfer<T>[],
): [T, (v: T) => void] {
  const [params, setParams] = useSearchParams()
  const bruto = params.get(chave)
  const valor = bruto !== null && (!validos || validos.includes(bruto as T)) ? (bruto as T) : padrao
  const definir = useCallback(
    (v: T) => {
      // Parte da URL atual, não da última renderização: duas mudanças seguidas (ex.: visão e agravo)
      // antes de a tela renderizar de novo não podem apagar uma à outra.
      const novo = new URLSearchParams(window.location.search)
      if (v === padrao || v === '') novo.delete(chave)
      else novo.set(chave, v)
      setParams(novo, { replace: true, preventScrollReset: true })
    },
    [chave, padrao, setParams],
  )
  return [valor, definir]
}

/** Caixa de seleção guardada na URL como `?chave=1`. */
export function useBooleanoNaUrl(chave: string): [boolean, (v: boolean) => void] {
  const [valor, definir] = useEstadoNaUrl(chave, '')
  const definirBooleano = useCallback((b: boolean) => definir(b ? '1' : ''), [definir])
  return [valor === '1', definirBooleano]
}
