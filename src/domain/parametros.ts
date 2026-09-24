import type { Parametros } from './types'

/** Prazos padrão (configuráveis pelo administrador em Configurações). */
export const PARAMETROS_PADRAO: Parametros = {
  prazoColetaConfirmatorioDias: 7,
  prazoResultadoConfirmatorioDias: 30,
  prazoInicioTratamentoDias: 7,
  prazoNotificacaoDias: 7,
  toleranciaBuscaAtivaDias: 3,
  alertaValidadeDias: 30,
  intervaloDoseSifilisDias: 7,
  seguimentoVdrlGestanteDias: 30,
  seguimentoVdrlDias: 90,
  // ≈ 30 dias de consumo de uma UBS de porte médio
  estoqueMinimo: { hiv_tr1: 20, hiv_tr2: 5, sifilis_tr: 20, hbsag_tr: 15, anti_hcv_tr: 15 },
}
