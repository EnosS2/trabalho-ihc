import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { GestanteBadge } from '@/components/ui/Badge'
import { usePessoas } from '@/data/hooks'
import { mascararDocumento } from '@/domain/rules/documentos'
import { nomeDeExibicao } from '@/domain/rules/pessoa'
import { cn } from '@/lib/cn'

const MAX_SUGESTOES = 6

/** Tecla "/" em qualquer tela leva à busca, desde que o foco não esteja num campo de texto. */
function focoEmCampo(el: Element | null) {
  return el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Busca de pessoas na barra superior (Trunk Test: "onde está a busca?"). Combobox ARIA:
 * setas escolhem, Enter abre o cadastro (ou a lista completa), Esc limpa e fecha.
 * Em telas pequenas vira um botão com lupa que abre o campo numa faixa abaixo da barra.
 */
export function BuscaGlobal() {
  const navegar = useNavigate()
  const [termo, setTermo] = useState('')
  const [atraso, setAtraso] = useState('')
  const [aberta, setAberta] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const [faixaMobile, setFaixaMobile] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const idLista = useId()
  const buscar = atraso.trim().length >= 2
  const { data, isFetching } = usePessoas(atraso.trim(), buscar)

  useEffect(() => {
    const t = setTimeout(() => setAtraso(termo), 200)
    return () => clearTimeout(t)
  }, [termo])

  useEffect(() => {
    const atalho = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || focoEmCampo(document.activeElement)) return
      if (document.querySelector('dialog[open]')) return
      e.preventDefault()
      setFaixaMobile(true)
      requestAnimationFrame(() => input.current?.focus())
    }
    document.addEventListener('keydown', atalho)
    return () => document.removeEventListener('keydown', atalho)
  }, [])

  useEffect(() => {
    if (!aberta) return
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberta(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberta])

  const sugestoes = buscar ? (data ?? []).slice(0, MAX_SUGESTOES) : []
  const total = data?.length ?? 0
  // A última opção é sempre "ver todos", que leva à tela Pessoas com a busca preenchida.
  const nOpcoes = buscar ? sugestoes.length + 1 : 0
  const mostrarLista = aberta && buscar

  function limpar() {
    setTermo('')
    setAtraso('')
    setAberta(false)
    setAtivo(-1)
    setFaixaMobile(false)
  }

  function escolher(indice: number) {
    const p = sugestoes[indice]
    navegar(p ? `/pessoas/${p.pessoa.id}` : `/pessoas?q=${encodeURIComponent(termo.trim())}`)
    limpar()
    input.current?.blur()
  }

  const idOpcao = (i: number) => `${idLista}-op-${i}`

  return (
    <div ref={raiz} className="flex min-w-0 flex-1 items-center md:relative md:max-w-lg">
      <button
        type="button"
        onClick={() => {
          setFaixaMobile((v) => !v)
          requestAnimationFrame(() => input.current?.focus())
        }}
        aria-expanded={faixaMobile}
        aria-label="Buscar pessoa"
        className="ml-auto inline-flex size-11 items-center justify-center rounded-lg hover:bg-surface-3 md:hidden"
      >
        <Search className="size-5" aria-hidden />
      </button>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (termo.trim().length >= 2) escolher(ativo)
        }}
        className={cn(
          'w-full',
          faixaMobile ? 'absolute inset-x-0 top-full border-b border-border bg-surface px-3 py-2 md:static md:border-0 md:p-0' : 'hidden md:block',
        )}
      >
        <label htmlFor={`${idLista}-campo`} className="sr-only">
          Buscar pessoa por nome, CNS ou CPF
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={input}
            id={`${idLista}-campo`}
            type="text"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={mostrarLista}
            aria-controls={idLista}
            aria-activedescendant={mostrarLista && ativo >= 0 ? idOpcao(ativo) : undefined}
            placeholder="Buscar pessoa por nome, CNS ou CPF"
            value={termo}
            onChange={(e) => {
              setTermo(e.target.value)
              setAberta(true)
              setAtivo(-1)
            }}
            onFocus={() => setAberta(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' && nOpcoes) {
                e.preventDefault()
                setAberta(true)
                setAtivo((i) => (i + 1) % nOpcoes)
              } else if (e.key === 'ArrowUp' && nOpcoes) {
                e.preventDefault()
                setAtivo((i) => (i <= 0 ? nOpcoes - 1 : i - 1))
              } else if (e.key === 'Escape') {
                e.preventDefault()
                if (termo) limpar()
                else {
                  setFaixaMobile(false)
                  input.current?.blur()
                }
              }
            }}
            className="min-h-11 w-full rounded-md border border-border-strong bg-surface py-2 pr-10 pl-10 text-fg placeholder:text-muted"
          />
          {termo ? (
            <button
              type="button"
              onClick={() => {
                limpar()
                input.current?.focus()
              }}
              aria-label="Limpar busca"
              className="absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-surface-3"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-border-strong bg-surface-2 px-1.5 text-xs text-muted md:block" aria-hidden>
              /
            </kbd>
          )}
        </div>

        {mostrarLista && (
          <ul
            id={idLista}
            role="listbox"
            aria-label="Pessoas encontradas"
            className="absolute inset-x-3 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-xl md:inset-x-0"
          >
            {sugestoes.length === 0 && (
              <li role="presentation" className="px-4 py-3 text-sm text-muted">
                {isFetching ? 'Buscando…' : 'Ninguém encontrado com esse nome ou documento.'}
              </li>
            )}
            {sugestoes.map(({ pessoa, idade }, i) => (
              <li
                key={pessoa.id}
                id={idOpcao(i)}
                role="option"
                aria-selected={ativo === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(i)}
                onMouseEnter={() => setAtivo(i)}
                className={cn('flex cursor-pointer flex-col px-4 py-2', ativo === i && 'bg-surface-3')}
              >
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  {nomeDeExibicao(pessoa)}
                  {pessoa.gestante && <GestanteBadge />}
                </span>
                <span className="flex flex-wrap gap-x-4 text-sm text-muted">
                  <span>{idade} anos</span>
                  {pessoa.cns && <span className="tabular">CNS {mascararDocumento(pessoa.cns)}</span>}
                  {!pessoa.cns && pessoa.cpf && <span className="tabular">CPF {mascararDocumento(pessoa.cpf)}</span>}
                </span>
              </li>
            ))}
            <li
              id={idOpcao(sugestoes.length)}
              role="option"
              aria-selected={ativo === sugestoes.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(sugestoes.length)}
              onMouseEnter={() => setAtivo(sugestoes.length)}
              className={cn(
                'cursor-pointer border-t border-border px-4 py-2.5 text-sm font-bold text-primary',
                ativo === sugestoes.length && 'bg-surface-3',
              )}
            >
              {total > MAX_SUGESTOES ? `Ver todos os resultados para “${termo.trim()}”` : 'Abrir a lista de pessoas'}
            </li>
          </ul>
        )}
      </form>
    </div>
  )
}
