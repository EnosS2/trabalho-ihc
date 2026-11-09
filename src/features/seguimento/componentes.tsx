import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import { FitaCompacta } from '@/components/ui/FitaDoCaso'
import type { PendenciaPainel } from '@/data/api'
import { etapasDoCaso, type Pendencia, type TipoPendencia } from '@/domain/rules/seguimento'
import { formatarData } from '@/lib/datas'
import { cn } from '@/lib/cn'

export const ICONE_PENDENCIA: Record<TipoPendencia, LucideIcon> = {
  coleta: ICONE.confirmatorio,
  resultado: ICONE.aguardando,
  inicio_tratamento: ICONE.tratamento,
  dose: ICONE.tratamento,
  vdrl: ICONE.confirmatorio,
  parceria: ICONE.pessoas,
  notificacao: ICONE.notificacoes,
}

/**
 * Lista de pendências com prazo. Cada linha: o que fazer e com quem (à esquerda); quando e em que
 * ponto do caminho a pessoa está (à direita: prazo + fita do caso).
 */
export function ListaPendencias({ itens, vazio }: { itens: PendenciaPainel[]; vazio?: string }) {
  if (itens.length === 0) {
    return <p className="px-1 py-4 text-sm text-muted">{vazio ?? 'Nenhuma pendência.'}</p>
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {itens.map((p) => {
        const Icone = ICONE_PENDENCIA[p.tipo]
        const { etapas, atual } = etapasDoCaso(p.agravo, p.status)
        return (
          <li key={`${p.casoId}-${p.chave}`}>
            <Link
              to={`/seguimento/${p.casoId}`}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-md px-2 py-3 hover:bg-surface-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <Icone className={cn('mt-0.5 size-5', p.vencida ? 'text-danger' : 'text-muted')} aria-hidden />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{p.pessoaNome}</span>
                  <AgravoBadge agravo={p.agravo} />
                  {p.gestante && <GestanteBadge />}
                </span>
                <span className="block text-sm text-muted">{p.descricao}</span>
              </span>
              <span className="col-start-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:col-start-3 sm:flex-col sm:items-end">
                <PrazoBadge prazo={p.prazo} diasRestantes={p.diasRestantes} />
                <FitaCompacta etapas={etapas} atual={atual} vencida={p.vencida} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Próxima ação do caso em destaque: o que fazer (em negrito, com o ícone da etapa) e até quando.
 * O fundo segue a urgência (vermelho vencida, âmbar até 2 dias), para ser achada de relance no
 * quadro do seguimento e na página da pessoa. Não é link: quem usa decide o destino.
 */
export function ProximaAcao({
  pendencia: p,
  outras = 0,
  semRotulo,
  className,
}: {
  pendencia: Pendencia
  outras?: number
  /** Sem o rótulo "Próxima ação" quando a seção em volta já tem esse título. */
  semRotulo?: boolean
  className?: string
}) {
  const Icone = ICONE_PENDENCIA[p.tipo]
  const tom = p.vencida ? 'border-danger/40 bg-danger-soft' : p.diasRestantes <= 2 ? 'border-warning/40 bg-warning-soft' : 'border-border bg-surface-2'
  return (
    <span className={cn('flex flex-col gap-1.5 rounded-md border px-2.5 py-2', tom, className)}>
      {!semRotulo && <span className="text-xs font-bold text-muted">Próxima ação</span>}
      <span className="flex items-start gap-2 font-bold leading-snug text-fg">
        <Icone className={cn('mt-0.5 size-4 shrink-0', p.vencida ? 'text-danger' : 'text-muted')} aria-hidden />
        {p.descricao}
      </span>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <PrazoBadge prazo={p.prazo} diasRestantes={p.diasRestantes} />
        <span className="text-muted tabular">até {formatarData(p.prazo)}</span>
      </span>
      {outras > 0 && <span className="text-xs text-muted">e mais {outras === 1 ? '1 pendência' : `${outras} pendências`}</span>}
    </span>
  )
}
