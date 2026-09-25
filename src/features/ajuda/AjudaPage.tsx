import { ArrowRight, Keyboard } from 'lucide-react'
import { ICONE } from '@/components/icones'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { PARAMETROS_PADRAO as P } from '@/domain/parametros'

const PERGUNTAS: { p: string; r: string }[] = [
  {
    p: 'Este sistema substitui o Sentinela, o e-SUS APS ou o SISLOGLAB?',
    r: 'Não. Ele cobre o que fica entre eles dentro da UBS: registro da testagem, seguimento de quem teve resultado reagente, estoque por lote e a preparação de uma notificação completa. A notificação continua sendo feita no Sentinela (ou por e-mail à DVS), e o fechamento mensal é exportado no formato do SISLOGLAB.',
  },
  {
    p: 'Quando um caso é aberto?',
    r: 'Automaticamente, ao finalizar uma testagem com resultado reagente (ou HIV com discordância persistente). O caso já nasce com os prazos de coleta, tratamento e notificação.',
  },
  {
    p: 'Gestante com teste rápido de sífilis reagente: o que muda?',
    r: 'Pela Nota Técnica CAIST/SMS, trata-se no mesmo dia, sem esperar o confirmatório. O assistente pergunta se a 1ª dose foi aplicada e agenda a 2ª e a 3ª. A sífilis em gestante já é notificável com um teste reagente.',
  },
  {
    p: 'Como funciona a busca ativa?',
    r: `Se a pessoa perde um prazo presencial (coleta, dose, VDRL ou início de tratamento) por mais de ${P.toleranciaBuscaAtivaDias} dias, o ACS da microárea recebe uma tarefa. Ele vê só que há um retorno pendente — nunca o diagnóstico. A tarefa se resolve sozinha quando a pendência é registrada no caso.`,
  },
  {
    p: 'Por que o sistema insiste em raça/cor e escolaridade?',
    r: 'O Boletim Epidemiológico nº 99 da DVS mostrou 43,6% de escolaridade ignorada em sífilis adquirida (2024). “Ignorado” é aceito, mas precisa ser escolhido de propósito e aparece como pendência de qualidade na notificação.',
  },
  {
    p: 'Qual lote o sistema sugere?',
    r: 'O que vence primeiro (FEFO — first expired, first out). Cada teste registrado baixa uma unidade do lote escolhido, inclusive testes inválidos.',
  },
  {
    p: 'Meus dados ficam salvos onde?',
    r: 'Neste protótipo, apenas no seu navegador. Na versão com backend, em servidor da prefeitura, com autenticação e trilha de auditoria.',
  },
]

const FLUXOS = [
  { titulo: 'HIV', passos: ['TR1', 'Se reagente: TR2 (outro fabricante)', 'TR1 R + TR2 R: diagnóstico → SAE/TARV', 'Discordante: repetir; persistindo → amostra venosa'] },
  { titulo: 'Sífilis', passos: ['Teste treponêmico', 'Reagente: coletar VDRL', 'Gestante: tratar no mesmo dia', 'VDRL mensal (gestante) / trimestral'] },
  { titulo: 'Hepatite B', passos: ['HBsAg', 'Reagente: HBV-DNA/marcadores', 'Serviço especializado', 'Testar/vacinar contatos'] },
  { titulo: 'Hepatite C', passos: ['Anti-HCV', 'Reagente: HCV-RNA', 'Tratamento com antivirais de ação direta'] },
]

export default function AjudaPage() {
  return (
    <>
      <PageHeader
        titulo="Central de ajuda"
        descricao="Respostas rápidas, fluxogramas e atalhos."
        acoes={
          <LinkButton to="/ajuda/guia-de-interface" variante="secundario">
            Guia de interface
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card aria-labelledby="t-faq">
          <CardHeader id="t-faq" titulo="Perguntas frequentes" icone={<ICONE.ajuda className="size-5" aria-hidden />} />
          <CardBody className="flex flex-col gap-2">
            {PERGUNTAS.map((q) => (
              <details key={q.p} className="group rounded-lg border border-border px-4 py-3 open:bg-surface-2">
                <summary className="cursor-pointer list-none font-bold marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {q.p}
                    <ArrowRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
                  </span>
                </summary>
                <p className="mt-2 text-sm text-muted">{q.r}</p>
              </details>
            ))}
          </CardBody>
        </Card>
        <div className="flex flex-col gap-6">
          <Card aria-labelledby="t-fluxos">
            <CardHeader id="t-fluxos" titulo="Fluxogramas resumidos" icone={<ICONE.seguimento className="size-5" aria-hidden />} />
            <CardBody className="flex flex-col gap-4">
              {FLUXOS.map((f) => (
                <div key={f.titulo}>
                  <h3 className="font-bold">{f.titulo}</h3>
                  <ol className="mt-1 flex flex-wrap items-center gap-1 text-sm">
                    {f.passos.map((p, i) => (
                      <li key={p} className="flex items-center gap-1">
                        {i > 0 && <ArrowRight className="size-3.5 text-muted" aria-hidden />}
                        <span className="rounded-md bg-surface-3 px-2 py-0.5">{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              <p className="text-xs text-muted">
                Fontes: manuais técnicos do MS (HIV Portaria nº 29/2013; sífilis GM/MS nº 2.012/2016; hepatites nº 25/2015), Nota
                Técnica CAIST/SMS Porto Alegre.
              </p>
            </CardBody>
          </Card>
          <Card aria-labelledby="t-teclado">
            <CardHeader id="t-teclado" titulo="Teclado" icone={<Keyboard className="size-5" aria-hidden />} />
            <CardBody>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                {[
                  ['Tab / Shift+Tab', 'Avançar / voltar entre elementos'],
                  ['Enter / Espaço', 'Ativar botão ou opção'],
                  ['Setas', 'Mudar de opção em grupos e abas'],
                  ['Esc', 'Fechar diálogo, menu ou gaveta'],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt><kbd className="rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 text-xs">{k}</kbd></dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>
          <Aviso tom="info" titulo="Suporte">
            Dúvidas sobre o fluxo clínico: responsável técnica da UBS. Problemas no sistema: suporte de TI.
          </Aviso>
        </div>
      </div>
    </>
  )
}
