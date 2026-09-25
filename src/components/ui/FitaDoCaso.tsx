import { cn } from '@/lib/cn'

/**
 * Fita do caso: a trilha do cuidado desenhada como a janela do cassete de teste rápido, com uma
 * faixa por etapa (como as linhas C e T). Faixa cheia = etapa concluída; faixa em âmbar (ou
 * vermelha, se há prazo vencido) = etapa em andamento; faixa apagada = etapa futura.
 * É o elemento de identidade do sistema: aparece no painel, no quadro de seguimento e no caso.
 */
interface Props {
  etapas: string[]
  /** Índice da etapa em andamento; `etapas.length` quando o caso está encerrado. */
  atual: number
  /** Há prazo vencido na etapa atual: a faixa em andamento fica vermelha. */
  vencida?: boolean
}

function corDaFaixa(i: number, atual: number, vencida?: boolean) {
  if (i < atual) return 'bg-primary'
  if (i === atual) return vencida ? 'bg-danger' : 'bg-accent-fill'
  return 'bg-border'
}

function descricao(etapas: string[], atual: number) {
  return atual >= etapas.length ? 'Caso encerrado, todas as etapas concluídas' : `Etapa ${atual + 1} de ${etapas.length}: ${etapas[atual]}`
}

/** Versão compacta, para linhas de lista e cabeçalhos: janela pequena + nome da etapa. */
export function FitaCompacta({ etapas, atual, vencida, semRotulo }: Props & { semRotulo?: boolean }) {
  const rotulo = atual >= etapas.length ? 'Encerrado' : etapas[atual]
  return (
    <span className="inline-flex items-center gap-2" title={descricao(etapas, atual)}>
      <span
        role="img"
        aria-label={descricao(etapas, atual)}
        className="inline-flex h-5 shrink-0 items-center gap-[3px] rounded-[5px] border border-border-strong/50 bg-surface-2 px-[5px]"
      >
        {etapas.map((e, i) => (
          <span key={e} className={cn('h-3 w-[3px] rounded-full', corDaFaixa(i, atual, vencida))} />
        ))}
      </span>
      {!semRotulo && (
        <span aria-hidden className="text-sm text-muted">
          {rotulo}
        </span>
      )}
    </span>
  )
}

/** Versão completa, no detalhe do caso: a janela do cassete com o nome de cada etapa sob a faixa. */
export function FitaDoCaso({ etapas, atual, vencida }: Props) {
  return (
    <nav aria-label="Etapas do caso">
      <div className="rounded-xl border border-border-strong/40 bg-surface p-2">
        <ol
          className="grid rounded-lg border border-border bg-surface-2 px-2 pt-3 pb-2.5"
          style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
        >
          {etapas.map((e, i) => {
            const feita = i < atual
            const emAndamento = i === atual
            return (
              <li key={e} className="flex flex-col items-center gap-2 text-center" aria-current={emAndamento ? 'step' : undefined}>
                <span aria-hidden className={cn('h-10 w-2 rounded-full', corDaFaixa(i, atual, vencida))} />
                <span className={cn('text-sm leading-tight', emAndamento ? 'font-bold text-fg' : feita ? 'text-fg' : 'text-muted')}>
                  {e}
                  <span className="sr-only">{feita ? ' (concluída)' : emAndamento ? ' (em andamento)' : ' (a fazer)'}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </nav>
  )
}
