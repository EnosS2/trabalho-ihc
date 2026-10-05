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

// ---------- Digitação de datas no formato brasileiro ----------
// O <input type="date"> nativo segue o idioma do NAVEGADOR (mm/dd/yyyy num Chrome em inglês), não o
// `lang` da página. Os campos de data do sistema são de texto com máscara dd/mm/aaaa.

/** Aplica a máscara enquanto se digita: "0503" → "05/03", "05031990" → "05/03/1990". Aceita colar "1990-03-05". */
export function mascararData(texto: string): string {
  const iso = texto.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const digitos = iso ? `${iso[3]}${iso[2]}${iso[1]}` : texto.replace(/\D/g, '').slice(0, 8)
  return [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(Boolean).join('/')
}

/** "05/03/1990" → "1990-03-05"; texto incompleto ou data inexistente (31/02) → null. */
export function dataBrParaIso(texto: string): ISODate | null {
  const m = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  const [, dd, mm, aaaa] = m
  const d = new Date(Number(aaaa), Number(mm) - 1, Number(dd))
  if (d.getFullYear() !== Number(aaaa) || d.getMonth() !== Number(mm) - 1 || d.getDate() !== Number(dd)) return null
  if (Number(aaaa) < 1900) return null
  return `${aaaa}-${mm}-${dd}`
}

/** "1990-03-05" → "05/03/1990" (vazio continua vazio). */
export function isoParaDataBr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
