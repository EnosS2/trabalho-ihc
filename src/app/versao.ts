import { formatarDataHora } from '@/lib/datas'

/** Injetado pelo vite.config no build: data (ISO) e hash curto do último commit. */
declare const __VERSAO__: { data: string; hash: string }

export const VERSAO = __VERSAO__

/** "28/09/2026 às 16:10", no fuso de quem abre o site. */
export const ultimaAtualizacao = formatarDataHora(VERSAO.data)
