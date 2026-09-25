import { ChevronDown, CircleX } from 'lucide-react'
import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const controle =
  'w-full min-h-11 rounded-md border border-border-strong bg-surface px-3 py-2 text-fg placeholder:text-muted/80 aria-[invalid=true]:border-danger aria-[invalid=true]:border-2 disabled:bg-surface-3 disabled:text-muted'

/**
 * Campo acessível: rótulo visível sempre (nunca só placeholder), dica e erro ligados
 * ao controle via aria-describedby, erro com ícone + texto (não só cor vermelha).
 *
 * Alinhamento: dentro de <GrupoCampos>, o campo ocupa 4 linhas da grade (rótulo, dica, controle,
 * erro) via subgrid. Lado a lado, os rótulos alinham entre si e as caixas também, mesmo quando só
 * um dos campos tem dica. O espaçamento interno é por margem (não por gap), para que uma linha vazia
 * não deixe buraco entre o rótulo e a caixa. Fora do grupo, o campo é uma coluna simples.
 */
export function Field({
  label,
  dica,
  erro,
  obrigatorio,
  children,
  className,
  id,
}: {
  label: ReactNode
  dica?: ReactNode
  erro?: string
  obrigatorio?: boolean
  children: ReactNode
  className?: string
  id?: string
}) {
  const gerado = useId()
  const idCampo = id ?? gerado
  const dicaId = dica ? `${idCampo}-dica` : undefined
  const erroId = erro ? `${idCampo}-erro` : undefined
  const descricao = [dicaId, erroId].filter(Boolean).join(' ') || undefined
  const controleFilho = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: idCampo,
        'aria-describedby': descricao,
        'aria-invalid': erro ? true : undefined,
        'aria-required': obrigatorio || undefined,
      })
    : children
  return (
    <div className={cn('campo flex flex-col', className)}>
      <label htmlFor={idCampo} className="row-start-1 self-end text-sm font-bold text-fg">
        {label}
        {obrigatorio ? (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        ) : null}
      </label>
      {dica && (
        <p id={dicaId} className="row-start-2 mt-1 text-sm text-muted">
          {dica}
        </p>
      )}
      <div className="row-start-3 mt-1">{controleFilho}</div>
      {erro && (
        <p id={erroId} className="row-start-4 mt-1 flex items-center gap-1 text-sm font-bold text-danger" role="alert">
          <CircleX className="size-4 shrink-0" aria-hidden />
          {erro}
        </p>
      )}
    </div>
  )
}

/**
 * Bloco de campos com título. A legenda vira um título de seção (fio fino acima, sem caixa em volta),
 * no mesmo padrão das seções das outras telas; continua sendo <legend>, lida pelo leitor de tela.
 */
export function GrupoCampos({ legenda, children, className }: { legenda: ReactNode; children: ReactNode; className?: string }) {
  return (
    <fieldset
      className={cn(
        'grid min-w-0 gap-x-4 border-t border-border pt-5 sm:grid-cols-2',
        '*:mb-4 [&>.campo]:row-span-4 [&>.campo]:grid [&>.campo]:grid-rows-subgrid [&>.campo]:content-start',
        className,
      )}
    >
      <legend className="float-left col-span-full w-full text-xl font-bold">{legenda}</legend>
      {children}
    </fieldset>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controle, className)} {...rest} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controle, 'min-h-24', className)} {...rest} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(controle, 'appearance-none pr-10', className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  )
}

export function Checkbox({
  label,
  descricao,
  className,
  ...rest
}: { label: ReactNode; descricao?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-[var(--primary)]"
        aria-describedby={descricao ? `${id}-d` : undefined}
        {...rest}
      />
      <div>
        <label htmlFor={id} className="cursor-pointer font-bold">
          {label}
        </label>
        {descricao && (
          <p id={`${id}-d`} className="text-sm text-muted">
            {descricao}
          </p>
        )}
      </div>
    </div>
  )
}

export interface OpcaoRadio<T extends string> {
  valor: T
  rotulo: ReactNode
  descricao?: ReactNode
  icone?: ReactNode
  /** Classe aplicada quando selecionado (ex.: cor do resultado). */
  classeSelecionado?: string
}

/**
 * Opções grandes (cartões) com rádio nativo: alvo de toque amplo, setas do teclado funcionam,
 * leitor de tela anuncia grupo + opção. Usado para resultados de teste (prevenção de erro).
 */
export function RadioCards<T extends string>({
  legenda,
  nome,
  opcoes,
  valor,
  onChange,
  colunas = 3,
  legendaVisivel = true,
  erro,
}: {
  legenda: ReactNode
  nome: string
  opcoes: OpcaoRadio<T>[]
  valor?: T
  onChange: (v: T) => void
  colunas?: 2 | 3 | 4
  legendaVisivel?: boolean
  erro?: string
}) {
  const grid = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[colunas]
  return (
    <fieldset>
      <legend className={cn('mb-2 text-sm font-bold', !legendaVisivel && 'sr-only')}>{legenda}</legend>
      <div className={cn('grid grid-cols-1 gap-2', grid)}>
        {opcoes.map((o) => {
          const selecionado = valor === o.valor
          return (
            <label
              key={o.valor}
              className={cn(
                'relative flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border-2 bg-surface p-3 transition-colors hover:bg-surface-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                selecionado ? (o.classeSelecionado ?? 'border-primary bg-primary-soft') : 'border-border',
              )}
            >
              <input
                type="radio"
                name={nome}
                value={o.valor}
                checked={selecionado}
                onChange={() => onChange(o.valor)}
                className="mt-1 size-4 shrink-0 accent-[var(--primary)] focus-visible:outline-none"
              />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 font-bold">
                  {o.icone}
                  {o.rotulo}
                </span>
                {o.descricao && <span className="text-sm text-muted">{o.descricao}</span>}
              </span>
            </label>
          )
        })}
      </div>
      {erro && (
        <p className="mt-1 flex items-center gap-1 text-sm font-bold text-danger" role="alert">
          <CircleX className="size-4" aria-hidden />
          {erro}
        </p>
      )}
    </fieldset>
  )
}

/** Controle segmentado para filtros (rádios nativos). */
export function Segmented<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string
  opcoes: { valor: T; rotulo: ReactNode; contagem?: number }[]
  valor: T
  onChange: (v: T) => void
}) {
  const nome = useId()
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{rotulo}</legend>
      <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface-2 p-1">
        {opcoes.map((o) => (
          <label
            key={o.valor}
            className={cn(
              'flex min-h-10 cursor-pointer items-center gap-2 rounded-md px-3 text-sm font-bold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus',
              valor === o.valor ? 'bg-surface text-primary ring-1 ring-border' : 'text-muted hover:text-fg',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={nome}
              checked={valor === o.valor}
              onChange={() => onChange(o.valor)}
            />
            {o.rotulo}
            {o.contagem !== undefined && (
              <span className="rounded-full bg-surface-3 px-2 text-xs tabular text-fg">{o.contagem}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
