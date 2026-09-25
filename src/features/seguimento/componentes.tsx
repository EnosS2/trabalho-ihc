import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import { FitaCompacta } from '@/components/ui/FitaDoCaso'
import type { PendenciaPainel } from '@/data/api'
import { etapasDoCaso, type TipoPendencia } from '@/domain/rules/seguimento'
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
