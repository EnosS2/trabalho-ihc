import { somarDias } from '@/lib/datas'
import type {
  AgravoNotificacao,
  CampoCompletude,
  Caso,
  Completude,
  DestinoNotificacao,
  ISODate,
  Parametros,
  Pessoa,
} from '../types'

export interface Classificacao {
  agravoNotificacao: AgravoNotificacao
  destino: DestinoNotificacao
  /** Data em que o caso passou a ser notificável. */
  desde: ISODate
}

/**
 * Define se o caso já é notificável e para onde vai a notificação.
 * - Sífilis em gestante: basta um teste reagente (definição de caso) → Sentinela.
 * - Sífilis adquirida: após confirmação pelo não treponêmico → Sentinela.
 * - HIV: diagnóstico estabelecido → Sentinela; gestante HIV + criança exposta → e-mail à DVS.
 * - Hepatites B e C: após confirmação → Sentinela.
 */
export function classificarNotificacao(caso: Caso): Classificacao | null {
  const confirmado = caso.confirmatorio.resultado === 'confirmado'
  const desde = caso.confirmatorio.resultadoEm ?? caso.abertoEm
  switch (caso.agravo) {
    case 'sifilis':
      if (caso.gestante) return { agravoNotificacao: 'sifilis_gestante', destino: 'sentinela', desde: caso.abertoEm }
      return confirmado ? { agravoNotificacao: 'sifilis_adquirida', destino: 'sentinela', desde } : null
    case 'hiv':
      if (!confirmado) return null
      return caso.gestante
        ? { agravoNotificacao: 'hiv_gestante', destino: 'email_dvs', desde }
        : { agravoNotificacao: 'hiv', destino: 'sentinela', desde }
    case 'hepatite_b':
    case 'hepatite_c':
      return confirmado ? { agravoNotificacao: caso.agravo, destino: 'sentinela', desde } : null
  }
}

export function prazoNotificacao(classificacao: Classificacao, params: Parametros): ISODate {
  return somarDias(classificacao.desde, params.prazoNotificacaoDias)
}

/**
 * Completude dos campos exigidos pela ficha de notificação. Raça/cor e escolaridade
 * "ignorado" não bloqueiam o envio, mas contam como falha de qualidade
 * (43,6% de escolaridade ignorada em sífilis adquirida em 2024 — Boletim DVS nº 99).
 */
export function calcularCompletude(pessoa: Pessoa, caso: Caso): Completude {
  const e = pessoa.endereco
  const campos: CampoCompletude[] = [
    { campo: 'nome', rotulo: 'Nome completo', ok: pessoa.nome.trim().split(/\s+/).length >= 2, obrigatorio: true },
    { campo: 'dataNascimento', rotulo: 'Data de nascimento', ok: Boolean(pessoa.dataNascimento), obrigatorio: true },
    { campo: 'sexo', rotulo: 'Sexo', ok: pessoa.sexo !== 'I', obrigatorio: true },
    { campo: 'documento', rotulo: 'CNS ou CPF', ok: Boolean(pessoa.cns || pessoa.cpf), obrigatorio: true },
    { campo: 'nomeMae', rotulo: 'Nome da mãe', ok: Boolean(pessoa.nomeMae?.trim()), obrigatorio: true },
    {
      campo: 'endereco',
      rotulo: 'Endereço de residência',
      ok: Boolean(e.logradouro.trim() && e.numero.trim() && e.bairro.trim()),
      obrigatorio: true,
    },
    {
      campo: 'racaCor',
      rotulo: 'Raça/cor',
      ok: pessoa.racaCor !== 'ignorado',
      ignorado: pessoa.racaCor === 'ignorado',
      obrigatorio: false,
    },
    {
      campo: 'escolaridade',
      rotulo: 'Escolaridade',
      ok: pessoa.escolaridade !== 'ignorado',
      ignorado: pessoa.escolaridade === 'ignorado',
      obrigatorio: false,
    },
    { campo: 'telefone', rotulo: 'Telefone para contato', ok: Boolean(pessoa.telefone), obrigatorio: false },
  ]
  if (caso.gestante) {
    campos.push({ campo: 'dum', rotulo: 'DUM / idade gestacional', ok: Boolean(pessoa.dum), obrigatorio: true })
  }
  if (caso.agravo === 'sifilis') {
    campos.push({
      campo: 'titulo',
      rotulo: 'Titulação do VDRL',
      ok: Boolean(caso.confirmatorio.titulo),
      obrigatorio: !caso.gestante,
    })
  }
  if (caso.agravo === 'sifilis' && caso.gestante) {
    campos.push({
      campo: 'tratamento',
      rotulo: 'Esquema de tratamento e data de início',
      ok: Boolean(caso.tratamento?.iniciadoEm),
      obrigatorio: true,
    })
  }

  const ok = campos.filter((c) => c.ok).length
  const faltandoObrigatorios = campos.filter((c) => c.obrigatorio && !c.ok)
  return {
    percentual: Math.round((ok / campos.length) * 100),
    campos,
    faltandoObrigatorios,
    pronta: faltandoObrigatorios.length === 0,
  }
}
