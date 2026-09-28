import type { Pessoa } from '../types'

/**
 * Nome pelo qual a pessoa é chamada em toda a interface: o nome social, quando houver
 * (direito garantido no SUS pela Portaria nº 1.820/2009), senão o nome civil.
 * O nome civil só aparece onde é exigido: cadastro, ficha de notificação e documentos.
 */
export function nomeDeExibicao(p: Pick<Pessoa, 'nome' | 'nomeSocial'>): string {
  return p.nomeSocial?.trim() || p.nome
}

/** Texto usado nas buscas: encontra a pessoa tanto pelo nome civil quanto pelo social. */
export function nomesPesquisaveis(p: Pick<Pessoa, 'nome' | 'nomeSocial'>): string {
  return `${p.nome} ${p.nomeSocial ?? ''}`.trim()
}
