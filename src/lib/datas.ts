import { addDays, differenceInCalendarDays, differenceInYears, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { ISODate } from '@/domain/types'

/** Datas de domínio são `yyyy-MM-dd`; carimbos de hora usam ISO completo. */
export function paraISO(d: Date): ISODate {
  return format(d, 'yyyy-MM-dd')
}

export function hojeISO(): ISODate {
  return paraISO(new Date())
}

export function agoraISO(): string {
  return new Date().toISOString()
}

export function somarDias(data: ISODate, dias: number): ISODate {
  return paraISO(addDays(parseISO(data), dias))
}

/** Dias de `de` até `ate` (positivo se `ate` é depois). */
export function diasEntre(de: ISODate, ate: ISODate): number {
  return differenceInCalendarDays(parseISO(ate), parseISO(de))
}

export function idade(dataNascimento: ISODate, referencia: ISODate = hojeISO()): number {
  return differenceInYears(parseISO(referencia), parseISO(dataNascimento))
}

export function semanasGestacao(dum: ISODate, referencia: ISODate = hojeISO()): number {
  return Math.floor(diasEntre(dum, referencia) / 7)
}

export function formatarData(data?: ISODate): string {
  if (!data) return '—'
  return format(parseISO(data), 'dd/MM/yyyy')
}

/** "quinta-feira, 24 de setembro": para cabeçalhos, onde a data é lida, não comparada. */
export function formatarDataLonga(data: ISODate): string {
  return format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR })
}

export function formatarDataHora(data?: string): string {
  if (!data) return '—'
  return format(parseISO(data), "dd/MM/yyyy 'às' HH:mm")
}

export function formatarMes(mes: string): string {
  const texto = format(parseISO(`${mes}-01`), 'MMMM yyyy', { locale: ptBR })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export function formatarMesCurto(mes: string): string {
  return format(parseISO(`${mes}-01`), 'MMM/yy', { locale: ptBR })
}

export function tempoRelativo(data: string): string {
  return formatDistanceToNowStrict(parseISO(data), { locale: ptBR, addSuffix: true })
}

/** Texto amigável para prazo: "vence hoje", "vence em 3 dias", "vencido há 2 dias". */
export function descreverPrazo(prazo: ISODate, hoje: ISODate = hojeISO()): string {
  const d = diasEntre(hoje, prazo)
  if (d === 0) return 'vence hoje'
  if (d === 1) return 'vence amanhã'
  if (d > 1) return `vence em ${d} dias`
  if (d === -1) return 'venceu ontem'
  return `vencido há ${-d} dias`
}

export function mesDe(data: ISODate): string {
  return data.slice(0, 7)
}
