import type {
  Agravo,
  AgravoNotificacao,
  ConclusaoAgravo,
  DestinoNotificacao,
  Escolaridade,
  MotivoTestagem,
  Perfil,
  RacaCor,
  ResultadoTentativa,
  ResultadoTR,
  Sexo,
  StatusCaso,
  TipoDesfecho,
  TipoMovimentacao,
  TipoTeste,
} from './types'

export const PERFIL_ROTULO: Record<Perfil, string> = {
  acs: 'Agente comunitário de saúde',
  executor: 'Executor(a) de teste rápido',
  responsavel_tecnico: 'Responsável técnico(a)',
  gestor: 'Gestão APS / Vigilância',
  admin: 'Administração do sistema',
}

export const PERFIL_CURTO: Record<Perfil, string> = {
  acs: 'ACS',
  executor: 'Executor',
  responsavel_tecnico: 'RT',
  gestor: 'Gestor',
  admin: 'Admin',
}

/** Siglas: doenças não têm pictograma universal; a sigla é o signo que o profissional já usa. */
export const AGRAVO_SIGLA: Record<Agravo, string> = {
  hiv: 'HIV',
  sifilis: 'SIF',
  hepatite_b: 'HBV',
  hepatite_c: 'HCV',
}

export const AGRAVO_ROTULO: Record<Agravo, string> = {
  hiv: 'HIV',
  sifilis: 'Sífilis',
  hepatite_b: 'Hepatite B',
  hepatite_c: 'Hepatite C',
}

export const AGRAVOS: Agravo[] = ['hiv', 'sifilis', 'hepatite_b', 'hepatite_c']

export const TIPO_TESTE_ROTULO: Record<TipoTeste, string> = {
  hiv_tr1: 'HIV (TR1)',
  hiv_tr2: 'HIV (TR2)',
  sifilis_tr: 'Sífilis (treponêmico)',
  hbsag_tr: 'Hepatite B (HBsAg)',
  anti_hcv_tr: 'Hepatite C (anti-HCV)',
}

export const TIPO_TESTE_AGRAVO: Record<TipoTeste, Agravo> = {
  hiv_tr1: 'hiv',
  hiv_tr2: 'hiv',
  sifilis_tr: 'sifilis',
  hbsag_tr: 'hepatite_b',
  anti_hcv_tr: 'hepatite_c',
}

export const TIPOS_TESTE: TipoTeste[] = ['hiv_tr1', 'hiv_tr2', 'sifilis_tr', 'hbsag_tr', 'anti_hcv_tr']

/** Teste inicial de cada agravo no fluxograma. */
export const TESTE_INICIAL: Record<Agravo, TipoTeste> = {
  hiv: 'hiv_tr1',
  sifilis: 'sifilis_tr',
  hepatite_b: 'hbsag_tr',
  hepatite_c: 'anti_hcv_tr',
}

export const RESULTADO_TR_ROTULO: Record<ResultadoTR, string> = {
  reagente: 'Reagente',
  nao_reagente: 'Não reagente',
  invalido: 'Inválido',
}

export const CONCLUSAO_ROTULO: Record<ConclusaoAgravo, string> = {
  nao_reagente: 'Não reagente',
  reagente: 'Reagente',
  discordante: 'Discordante',
  invalido: 'Inválido, repetir',
  incompleto: 'Fluxo incompleto',
}

export const MOTIVO_ROTULO: Record<MotivoTestagem, string> = {
  pre_natal: 'Pré-natal',
  parceria_gestante: 'Parceria de gestante',
  demanda_espontanea: 'Demanda espontânea',
  exposicao_risco: 'Exposição de risco',
  prep_pep: 'PrEP / PEP',
  sintomas: 'Sinais ou sintomas',
  campanha: 'Campanha / ação extramuros',
}

export const SEXO_ROTULO: Record<Sexo, string> = { F: 'Feminino', M: 'Masculino', I: 'Ignorado' }

export const RACA_ROTULO: Record<RacaCor, string> = {
  branca: 'Branca',
  preta: 'Preta',
  parda: 'Parda',
  amarela: 'Amarela',
  indigena: 'Indígena',
  ignorado: 'Ignorado',
}

export const ESCOLARIDADE_ROTULO: Record<Escolaridade, string> = {
  analfabeto: 'Analfabeto',
  fundamental_incompleto: 'Fundamental incompleto',
  fundamental_completo: 'Fundamental completo',
  medio_incompleto: 'Médio incompleto',
  medio_completo: 'Médio completo',
  superior_incompleto: 'Superior incompleto',
  superior_completo: 'Superior completo',
  ignorado: 'Ignorado',
}

export const STATUS_CASO_ROTULO: Record<StatusCaso, string> = {
  aguardando_coleta: 'Aguardando coleta do confirmatório',
  aguardando_resultado: 'Aguardando resultado',
  aguardando_tratamento: 'Aguardando início do tratamento',
  em_tratamento: 'Em tratamento',
  em_seguimento: 'Em seguimento sorológico',
  encerrado: 'Encerrado',
}

export const STATUS_CASO_CURTO: Record<StatusCaso, string> = {
  aguardando_coleta: 'Aguarda coleta',
  aguardando_resultado: 'Aguarda resultado',
  aguardando_tratamento: 'Aguarda tratamento',
  em_tratamento: 'Em tratamento',
  em_seguimento: 'Em seguimento',
  encerrado: 'Encerrado',
}

export const STATUS_CASO_ORDEM: StatusCaso[] = [
  'aguardando_coleta',
  'aguardando_resultado',
  'aguardando_tratamento',
  'em_tratamento',
  'em_seguimento',
  'encerrado',
]

export const DESFECHO_ROTULO: Record<TipoDesfecho, string> = {
  tratamento_concluido: 'Tratamento concluído',
  vinculado_servico: 'Vinculado ao serviço especializado',
  descartado: 'Descartado pelo confirmatório',
  perda_seguimento: 'Perda de seguimento',
  transferido: 'Transferido de unidade',
  obito: 'Óbito',
}

export const AGRAVO_NOTIFICACAO_ROTULO: Record<AgravoNotificacao, string> = {
  sifilis_adquirida: 'Sífilis adquirida',
  sifilis_gestante: 'Sífilis em gestante',
  hiv: 'Infecção pelo HIV',
  hiv_gestante: 'Gestante HIV + criança exposta',
  hepatite_b: 'Hepatite B',
  hepatite_c: 'Hepatite C',
}

export const DESTINO_ROTULO: Record<DestinoNotificacao, string> = {
  sentinela: 'Sistema Sentinela',
  email_dvs: 'Ficha por e-mail à DVS',
}

export const RESULTADO_TENTATIVA_ROTULO: Record<ResultadoTentativa, string> = {
  contato_realizado: 'Contato feito, vai comparecer',
  agendado: 'Agendado na UBS',
  nao_encontrado: 'Não encontrado',
  endereco_incorreto: 'Endereço incorreto',
  recusou: 'Recusou atendimento',
}

export const MOVIMENTACAO_ROTULO: Record<TipoMovimentacao, string> = {
  entrada: 'Entrada',
  consumo: 'Consumo (teste)',
  perda: 'Perda',
  vencimento: 'Baixa por vencimento',
  ajuste: 'Ajuste de inventário',
}
