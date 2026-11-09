import { plural } from '@/lib/texto'
import type { AlertaEstoque } from './estoque'
import type { Pendencia } from './seguimento'

/**
 * Alertas do sino da barra superior: o que é urgente, juntado das várias telas, para ser achado
 * de qualquer lugar. Cada fonte só entra se o perfil tem acesso a ela (quem chama passa `undefined`).
 */
export type DestinoAlerta =
  | { tela: 'pendencias'; janela: 'vencidas' | 'hoje' }
  | { tela: 'notificacoes' }
  | { tela: 'estoque' }
  | { tela: 'busca-ativa' }

export type CategoriaAlerta = 'seguimento' | 'notificacao' | 'estoque' | 'busca'

export interface Alerta {
  id: string
  categoria: CategoriaAlerta
  grave: boolean
  texto: string
  detalhe?: string
  destino: DestinoAlerta
  /** Lote vencido que pode receber baixa direto do alerta. */
  loteParaBaixa?: string
}

export interface FontesAlertas {
  pendencias?: Pick<Pendencia, 'vencida' | 'diasRestantes'>[]
  notificacoes?: { pendentes: number; atrasadas: number }
  estoque?: AlertaEstoque[]
  buscaAtivaAbertas?: number
}

/** Graves primeiro; dentro da gravidade, na ordem do trabalho (seguimento, notificação, estoque, busca). */
export function montarAlertas(f: FontesAlertas): Alerta[] {
  const alertas: Alerta[] = []
  if (f.pendencias) {
    const vencidas = f.pendencias.filter((p) => p.vencida).length
    const hoje = f.pendencias.filter((p) => p.diasRestantes === 0).length
    if (vencidas)
      alertas.push({
        id: 'pendencias-vencidas',
        categoria: 'seguimento',
        grave: true,
        texto: `${plural(vencidas, 'pendência vencida', 'pendências vencidas')} no seguimento`,
        destino: { tela: 'pendencias', janela: 'vencidas' },
      })
    if (hoje)
      alertas.push({
        id: 'pendencias-hoje',
        categoria: 'seguimento',
        grave: false,
        texto: `${plural(hoje, 'pendência vence', 'pendências vencem')} hoje`,
        destino: { tela: 'pendencias', janela: 'hoje' },
      })
  }
  if (f.notificacoes && f.notificacoes.pendentes > 0) {
    const { pendentes, atrasadas } = f.notificacoes
    alertas.push({
      id: 'notificacoes',
      categoria: 'notificacao',
      grave: atrasadas > 0,
      texto: `${plural(pendentes, 'notificação', 'notificações')} a enviar`,
      detalhe: atrasadas > 0 ? `${atrasadas} fora do prazo` : 'todas dentro do prazo',
      destino: { tela: 'notificacoes' },
    })
  }
  for (const a of f.estoque ?? []) {
    alertas.push({
      id: `estoque-${a.id}`,
      categoria: 'estoque',
      grave: a.severidade === 'alta',
      texto: a.mensagem,
      destino: { tela: 'estoque' },
      loteParaBaixa: a.tipo === 'vencido' ? a.loteId : undefined,
    })
  }
  if (f.buscaAtivaAbertas) {
    alertas.push({
      id: 'busca-ativa',
      categoria: 'busca',
      grave: false,
      texto: `${plural(f.buscaAtivaAbertas, 'pessoa', 'pessoas')} a localizar na busca ativa`,
      destino: { tela: 'busca-ativa' },
    })
  }
  // sort é estável: mantém a ordem do trabalho dentro de cada gravidade.
  return alertas.sort((a, b) => Number(b.grave) - Number(a.grave))
}
