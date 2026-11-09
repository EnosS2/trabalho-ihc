import type { LucideIcon } from 'lucide-react'
import { PackageMinus } from 'lucide-react'
import { Link } from 'react-router'
import { useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { LinkButton } from '@/components/ui/Button'
import { useBuscaAtiva, useEstoque, usePainelUbs } from '@/data/hooks'
import { montarAlertas, type CategoriaAlerta, type DestinoAlerta } from '@/domain/rules/alertas'
import { pode } from '@/domain/permissoes'
import { cn } from '@/lib/cn'
import { plural } from '@/lib/texto'
import { Suspenso } from './Suspenso'

const ICONE_CATEGORIA: Record<CategoriaAlerta, LucideIcon> = {
  seguimento: ICONE.seguimento,
  notificacao: ICONE.notificacoes,
  estoque: ICONE.estoque,
  busca: ICONE.buscaAtiva,
}

function caminho(d: DestinoAlerta): string {
  switch (d.tela) {
    case 'pendencias':
      return `/?pendencias=${d.janela}`
    case 'notificacoes':
      return '/notificacoes'
    case 'estoque':
      return '/estoque'
    case 'busca-ativa':
      return '/busca-ativa'
  }
}

/** Junta o que é urgente para o perfil; cada fonte só é consultada se o perfil tem acesso. */
function useAlertas() {
  const { usuario } = useSessaoAtiva()
  const veCasos = pode(usuario, 'caso.ver')
  const veBusca = pode(usuario, 'busca.ver')
  const veEstoque = pode(usuario, 'estoque.ver')
  const painel = usePainelUbs(veCasos)
  const busca = useBuscaAtiva({ status: 'aberta' }, veBusca)
  const estoque = useEstoque(veEstoque)
  const temFonte = veCasos || veBusca || veEstoque
  const alertas = montarAlertas({
    pendencias: painel.data?.pendencias,
    notificacoes:
      painel.data && pode(usuario, 'notificacao.ver')
        ? { pendentes: painel.data.resumo.notificacoesPendentes, atrasadas: painel.data.resumo.notificacoesAtrasadas }
        : undefined,
    estoque: estoque.data?.alertas,
    buscaAtivaAbertas: busca.data?.length,
  })
  return { temFonte, alertas, podeDarBaixa: pode(usuario, 'estoque.gerir') }
}

/**
 * Sino da barra superior: o que é urgente fica a um clique de qualquer tela. O número conta os
 * alertas; fica vermelho se algum é grave (vencido ou fora do prazo). Perfis sem fonte de alerta
 * (gestão, admin) não veem o sino.
 */
export function SinoAlertas() {
  const { temFonte, alertas, podeDarBaixa } = useAlertas()
  if (!temFonte) return null
  const graves = alertas.filter((a) => a.grave).length
  const rotulo =
    alertas.length === 0
      ? 'Alertas: nada urgente'
      : `Alertas: ${alertas.length}${graves ? `, ${plural(graves, 'urgente')}` : ''}`

  return (
    <Suspenso
      rotulo={rotulo}
      classeGatilho="relative size-11 justify-center px-0"
      classePainel="max-sm:fixed max-sm:inset-x-4 max-sm:top-[4.5rem] max-sm:mt-0 max-sm:w-auto"
      gatilho={
        <>
          <ICONE.alertas className="size-6" aria-hidden />
          {alertas.length > 0 && (
            <span
              aria-hidden
              className={cn(
                'absolute top-1 right-0.5 min-w-5 rounded-full px-1 text-center text-xs leading-5 font-bold tabular',
                graves ? 'bg-danger text-white dark:text-bg' : 'bg-primary text-on-primary',
              )}
            >
              {alertas.length}
            </span>
          )}
        </>
      }
    >
      {(fechar) => (
        <div className="flex flex-col gap-2">
          <h2 className="font-bold">Alertas</h2>
          {alertas.length === 0 ? (
            <p className="flex items-center gap-2 py-2 text-sm text-muted">
              <ICONE.ok className="size-5 text-success" aria-hidden /> Nada urgente agora.
            </p>
          ) : (
            <ul className="-mx-2 flex max-h-[min(28rem,70vh)] flex-col divide-y divide-border overflow-y-auto">
              {alertas.map((a) => {
                const Icone = ICONE_CATEGORIA[a.categoria]
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 py-1">
                    <Link
                      to={caminho(a.destino)}
                      onClick={fechar}
                      className="-mx-1 flex min-w-0 flex-1 basis-48 gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-surface-2"
                    >
                      <Icone className={cn('mt-0.5 size-5 shrink-0', a.grave ? 'text-danger' : 'text-warning')} aria-hidden />
                      <span className="min-w-0">
                        <span className="sr-only">{a.grave ? 'Urgente: ' : 'Atenção: '}</span>
                        <span className={cn(a.detalhe && 'font-bold')}>{a.texto}</span>
                        {a.detalhe && <span className={cn('block', a.grave ? 'text-danger' : 'text-muted')}>{a.detalhe}</span>}
                      </span>
                    </Link>
                    {a.loteParaBaixa && podeDarBaixa && (
                      <LinkButton
                        to={`/estoque?baixa=${a.loteParaBaixa}`}
                        onClick={fechar}
                        tamanho="sm"
                        variante="secundario"
                        icone={PackageMinus}
                        className="ml-8"
                      >
                        Dar baixa
                      </LinkButton>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </Suspenso>
  )
}
