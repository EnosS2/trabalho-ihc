import type { Agravo, InterpretacaoAgravo, ResultadoTR, TipoTeste } from '../types'
import { TIPO_TESTE_AGRAVO } from '../rotulos'

/**
 * Interpretação dos testes rápidos segundo os fluxogramas do Ministério da Saúde
 * (manuais técnicos: HIV Portaria nº 29/2013; sífilis GM/MS nº 2.012/2016; hepatites nº 25/2015)
 * e Nota Técnica CAIST/SMS Porto Alegre (tratamento imediato de gestante com TR reagente).
 */

export interface TesteExecutado {
  tipo: TipoTeste
  resultado: ResultadoTR
  ordem: number
}

export interface ContextoTestagem {
  gestante: boolean
  exposicaoRecente: boolean
}

const JANELA =
  'Exposição de risco nos últimos 30 dias: repetir a testagem após 30 dias (janela imunológica).'

function base(agravo: Agravo): Pick<InterpretacaoAgravo, 'agravo' | 'abreCaso' | 'urgente'> {
  return { agravo, abreCaso: false, urgente: false }
}

function ultimo(testes: TesteExecutado[], tipo: TipoTeste, depoisDe = -Infinity) {
  const lista = testes.filter((t) => t.tipo === tipo && t.ordem > depoisDe).sort((a, b) => a.ordem - b.ordem)
  return lista.at(-1)
}

function naoReagente(agravo: Agravo, ctx: ContextoTestagem, extra: string[] = []): InterpretacaoAgravo {
  const condutas = [...extra]
  if (ctx.exposicaoRecente) condutas.push(JANELA)
  if (ctx.gestante) condutas.push('Gestante: repetir a testagem no 3º trimestre e na admissão para o parto.')
  condutas.push('Entregar o resultado com aconselhamento pós-teste e orientar prevenção combinada.')
  return {
    ...base(agravo),
    conclusao: 'nao_reagente',
    titulo: 'Amostra não reagente',
    mensagem: 'Resultado não reagente. Não há necessidade de teste adicional.',
    condutas,
  }
}

function invalido(agravo: Agravo, repetir: TipoTeste): InterpretacaoAgravo {
  return {
    ...base(agravo),
    conclusao: 'invalido',
    titulo: 'Teste inválido',
    mensagem: 'O controle do teste não apareceu. Repita com um novo dispositivo (se possível, de outro lote).',
    condutas: ['Repetir o teste com novo dispositivo.'],
    proximoTeste: repetir,
  }
}

function incompleto(agravo: Agravo, proximo: TipoTeste, mensagem: string): InterpretacaoAgravo {
  return {
    ...base(agravo),
    conclusao: 'incompleto',
    titulo: 'Aguardando próximo teste',
    mensagem,
    condutas: [],
    proximoTeste: proximo,
  }
}

function interpretarHiv(testes: TesteExecutado[], ctx: ContextoTestagem): InterpretacaoAgravo {
  const tr1 = ultimo(testes, 'hiv_tr1')
  if (!tr1) return incompleto('hiv', 'hiv_tr1', 'Realize o TR1 de HIV.')
  if (tr1.resultado === 'invalido') return invalido('hiv', 'hiv_tr1')
  if (tr1.resultado === 'nao_reagente') return naoReagente('hiv', ctx)

  const tr2 = ultimo(testes, 'hiv_tr2', tr1.ordem)
  if (!tr2) {
    return incompleto(
      'hiv',
      'hiv_tr2',
      'TR1 reagente. Realize o TR2 com kit de fabricante diferente antes de concluir.',
    )
  }
  if (tr2.resultado === 'invalido') return invalido('hiv', 'hiv_tr2')

  if (tr2.resultado === 'reagente') {
    const condutas = [
      'Diagnóstico de infecção pelo HIV estabelecido pelo fluxograma com dois testes rápidos.',
      'Coletar carga viral (CV-HIV) e contagem de LT-CD4+.',
      'Vincular ao Serviço de Atendimento Especializado (SAE) para início da TARV.',
      'Testar parcerias sexuais e oferecer PEP quando indicado.',
    ]
    if (ctx.gestante) {
      condutas.unshift('Gestante: iniciar TARV o quanto antes para prevenir a transmissão vertical.')
      condutas.push('Notificar gestante HIV + criança exposta por ficha enviada por e-mail à DVS.')
    } else {
      condutas.push('Notificar infecção pelo HIV no Sentinela.')
    }
    return {
      ...base('hiv'),
      conclusao: 'reagente',
      titulo: 'Amostra reagente para HIV',
      mensagem: 'TR1 e TR2 reagentes.',
      condutas,
      abreCaso: true,
      urgente: ctx.gestante,
    }
  }

  // TR1 reagente + TR2 não reagente = discordante
  const rodadasDiscordantes = testes
    .filter((t) => t.tipo === 'hiv_tr1' && t.resultado === 'reagente')
    .filter((t1) => {
      const t2 = testes
        .filter((t) => t.tipo === 'hiv_tr2' && t.ordem > t1.ordem)
        .sort((a, b) => a.ordem - b.ordem)[0]
      return t2?.resultado === 'nao_reagente'
    }).length

  if (rodadasDiscordantes < 2) {
    return {
      ...base('hiv'),
      conclusao: 'discordante',
      titulo: 'Resultados discordantes',
      mensagem: 'TR1 reagente e TR2 não reagente. Repita o fluxograma (TR1 e TR2).',
      condutas: ['Repetir TR1 e TR2 com novos dispositivos.'],
      proximoTeste: 'hiv_tr1',
    }
  }
  return {
    ...base('hiv'),
    conclusao: 'discordante',
    titulo: 'Discordância persistente',
    mensagem: 'A discordância se manteve após repetição. É necessária amostra venosa para o laboratório.',
    condutas: [
      'Coletar amostra por punção venosa e encaminhar ao laboratório (imunoensaio + teste complementar).',
      'Agendar retorno para entrega do resultado.',
    ],
    abreCaso: true,
    urgente: ctx.gestante,
  }
}

function interpretarSifilis(testes: TesteExecutado[], ctx: ContextoTestagem): InterpretacaoAgravo {
  const tr = ultimo(testes, 'sifilis_tr')
  if (!tr) return incompleto('sifilis', 'sifilis_tr', 'Realize o teste treponêmico.')
  if (tr.resultado === 'invalido') return invalido('sifilis', 'sifilis_tr')
  if (tr.resultado === 'nao_reagente') return naoReagente('sifilis', ctx)

  if (ctx.gestante) {
    return {
      ...base('sifilis'),
      conclusao: 'reagente',
      titulo: 'Gestante com teste treponêmico reagente',
      mensagem:
        'Tratar hoje, sem aguardar o confirmatório. Já é caso notificável de sífilis em gestante.',
      condutas: [
        'Aplicar hoje a 1ª dose de benzilpenicilina benzatina 2.400.000 UI IM (Nota Técnica CAIST/SMS).',
        'Programar 2ª e 3ª doses com intervalo de 7 dias (total 7.200.000 UI).',
        'Coletar VDRL (não treponêmico) para titulação e seguimento mensal.',
        'Convocar, testar e tratar as parcerias sexuais.',
        'Notificar sífilis em gestante no Sentinela.',
      ],
      abreCaso: true,
      urgente: true,
    }
  }
  return {
    ...base('sifilis'),
    conclusao: 'reagente',
    titulo: 'Teste treponêmico reagente',
    mensagem: 'Teste rápido reagente não define caso: coletar não treponêmico para confirmar e titular.',
    condutas: [
      'Coletar VDRL (não treponêmico) para confirmação e titulação.',
      'Tratar após confirmação — ou imediatamente se houver sinais/sintomas ou risco de perda de seguimento.',
      'Investigar tratamento prévio (cicatriz sorológica).',
      'Convocar e testar as parcerias sexuais.',
    ],
    abreCaso: true,
    urgente: false,
  }
}

function interpretarHepatite(
  agravo: 'hepatite_b' | 'hepatite_c',
  testes: TesteExecutado[],
  ctx: ContextoTestagem,
): InterpretacaoAgravo {
  const tipo: TipoTeste = agravo === 'hepatite_b' ? 'hbsag_tr' : 'anti_hcv_tr'
  const tr = ultimo(testes, tipo)
  if (!tr) return incompleto(agravo, tipo, 'Realize o teste rápido.')
  if (tr.resultado === 'invalido') return invalido(agravo, tipo)
  if (tr.resultado === 'nao_reagente') {
    return naoReagente(
      agravo,
      ctx,
      agravo === 'hepatite_b' ? ['Verificar situação vacinal para hepatite B e vacinar se necessário.'] : [],
    )
  }
  if (agravo === 'hepatite_b') {
    const condutas = [
      'Coletar HBV-DNA e marcadores sorológicos para confirmação.',
      'Encaminhar ao serviço especializado.',
      'Testar contatos domiciliares e parcerias; vacinar os suscetíveis.',
    ]
    if (ctx.gestante) {
      condutas.push('Gestante: encaminhar ao pré-natal de alto risco; RN deve receber vacina e imunoglobulina ao nascer.')
    }
    return {
      ...base(agravo),
      conclusao: 'reagente',
      titulo: 'HBsAg reagente',
      mensagem: 'Resultado sugestivo de infecção pelo HBV. Confirmar em laboratório.',
      condutas,
      abreCaso: true,
      urgente: ctx.gestante,
    }
  }
  return {
    ...base(agravo),
    conclusao: 'reagente',
    titulo: 'Anti-HCV reagente',
    mensagem: 'Indica contato com o HCV. Confirmar infecção ativa com carga viral.',
    condutas: [
      'Coletar HCV-RNA (carga viral) para confirmar infecção ativa.',
      'Encaminhar para tratamento com antivirais de ação direta, se confirmado.',
    ],
    abreCaso: true,
    urgente: false,
  }
}

export function interpretarAgravo(
  agravo: Agravo,
  testes: TesteExecutado[],
  ctx: ContextoTestagem,
): InterpretacaoAgravo {
  const doAgravo = testes.filter((t) => TIPO_TESTE_AGRAVO[t.tipo] === agravo)
  switch (agravo) {
    case 'hiv':
      return interpretarHiv(doAgravo, ctx)
    case 'sifilis':
      return interpretarSifilis(doAgravo, ctx)
    case 'hepatite_b':
    case 'hepatite_c':
      return interpretarHepatite(agravo, doAgravo, ctx)
  }
}

export function interpretarTestagem(
  agravos: Agravo[],
  testes: TesteExecutado[],
  ctx: ContextoTestagem,
): InterpretacaoAgravo[] {
  return agravos.map((a) => interpretarAgravo(a, testes, ctx))
}

/** Uma testagem só pode ser finalizada quando nenhum agravo exige teste adicional. */
export function testagemConcluida(interpretacoes: InterpretacaoAgravo[]): boolean {
  return interpretacoes.every((i) => !i.proximoTeste)
}
