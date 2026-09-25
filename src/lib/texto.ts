/** "1 caso", "3 casos", "2 notificações": plural de verdade em vez de "caso(s)". */
export function plural(n: number, singular: string, pluralForma = `${singular}s`) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? singular : pluralForma}`
}
