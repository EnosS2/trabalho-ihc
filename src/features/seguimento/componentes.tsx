import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { ICONE } from '@/components/icones'
import { AgravoBadge, GestanteBadge, PrazoBadge } from '@/components/ui/Badge'
import type { PendenciaPainel } from '@/data/api'
import type { TipoPendencia } from '@/domain/rules/seguimento'
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

/** Lista de pendências com prazo: ícone do tipo + pessoa + agravo + prazo (texto e cor). */
export function ListaPendencias({ itens, vazio }: { itens: PendenciaPainel[]; vazio?: string }) {
  if (itens.length === 0) {
    return <p className="px-1 py-4 text-sm text-muted">{vazio ?? 'Nenhuma pendência.'}</p>
  }
  return (
    <ul className="flex flex-col divide-y divide-border">
      {itens.map((p) => {
        const Icone = ICONE_PENDENCIA[p.tipo]
        return (
          <li key={`${p.casoId}-${p.chave}`}>
            <Link
              to={`/seguimento/${p.casoId}`}
              className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-surface-2"
            >
              <span
                className={cn(
                  'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
                  p.vencida ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary',
                )}
              >
                <Icone className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{p.pessoaNome}</span>
                  <AgravoBadge agravo={p.agravo} />
                  {p.gestante && <GestanteBadge />}
                </span>
                <span className="block text-sm text-muted">{p.descricao}</span>
              </span>
              <span className="shrink-0">
                <PrazoBadge prazo={p.prazo} diasRestantes={p.diasRestantes} />
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
