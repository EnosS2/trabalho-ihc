import { Eye, EyeOff, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { AgravoBadge, Badge, GestanteBadge, StatusCasoBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Aviso, Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { DescricaoLista, LinhaDoTempo, PageHeader } from '@/components/ui/Layout'
import { usePessoa } from '@/data/hooks'
import { formatarCns, formatarCpf, formatarTelefone, mascararDocumento } from '@/domain/rules/documentos'
import { AGRAVO_ROTULO, ESCOLARIDADE_ROTULO, MOTIVO_ROTULO, RACA_ROTULO, SEXO_ROTULO } from '@/domain/rotulos'
import { formatarData, semanasGestacao } from '@/lib/datas'
import { ResultadosResumo } from '@/features/testagem/TestagensPage'

export default function PessoaDetalhePage() {
  const { id } = useParams()
  const { data, isLoading, error } = usePessoa(id)
  const [revelar, setRevelar] = useState(false)
  const podeEditar = usePode('pessoa.editar')
  const podeTestar = usePode('testagem.registrar')

  if (isLoading) return <Carregando />
  if (error || !data) return <EstadoErro erro={error} />
  const { pessoa: p, idade, microarea, testagens, casos } = data
  const ignorados = [p.racaCor === 'ignorado' && 'raça/cor', p.escolaridade === 'ignorado' && 'escolaridade', !p.nomeMae && 'nome da mãe', !p.telefone && 'telefone'].filter(Boolean)

  return (
    <>
      <PageHeader
        titulo={p.nomeSocial ?? p.nome}
        tituloAba="Cadastro da pessoa"
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <span>{idade} anos</span>
            <span>{SEXO_ROTULO[p.sexo]}</span>
            {p.gestante && (
              <>
                <GestanteBadge />
                {p.dum && <span>{semanasGestacao(p.dum)} semanas</span>}
              </>
            )}
          </span>
        }
        trilha={[{ rotulo: 'Pessoas', para: '/pessoas' }, { rotulo: p.nome }]}
        acoes={
          <>
            {podeEditar && (
              <LinkButton to={`/pessoas/${p.id}/editar`} variante="secundario" icone={Pencil}>
                Editar cadastro
              </LinkButton>
            )}
            {podeTestar && (
              <LinkButton to={`/testagem/nova?pessoa=${p.id}`} icone={ICONE.novaTestagem}>
                Nova testagem
              </LinkButton>
            )}
          </>
        }
      />

      {ignorados.length > 0 && (
        <Aviso tom="atencao" className="mb-6" titulo="Cadastro incompleto para a notificação">
          Faltando ou ignorado: {ignorados.join(', ')}. Aproveite o atendimento para completar.
        </Aviso>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Card aria-labelledby="t-casos">
            <CardHeader id="t-casos" titulo="Casos de seguimento" icone={<ICONE.seguimento className="size-5" aria-hidden />} />
            <CardBody>
              {casos.length === 0 ? (
                <p className="text-sm text-muted">Nenhum caso aberto para esta pessoa.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {casos.map((c) => (
                    <li key={c.caso.id}>
                      <Link to={`/seguimento/${c.caso.id}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 hover:bg-surface-2">
                        <AgravoBadge agravo={c.caso.agravo} />
                        <span className="font-bold">{AGRAVO_ROTULO[c.caso.agravo]}</span>
                        <span className="text-sm text-muted">aberto em {formatarData(c.caso.abertoEm)}</span>
                        <span className="ml-auto">
                          <StatusCasoBadge status={c.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card aria-labelledby="t-hist">
            <CardHeader id="t-hist" titulo="Histórico de testagens" icone={<ICONE.testagens className="size-5" aria-hidden />} />
            <CardBody>
              {testagens.length === 0 ? (
                <EstadoVazio icone={ICONE.novaTestagem} titulo="Ainda não testada nesta UBS" />
              ) : (
                <LinhaDoTempo
                  itens={testagens.map((t) => ({
                    id: t.id,
                    data: formatarData(t.data),
                    icone: ICONE.novaTestagem,
                    tom: t.interpretacoes.some((i) => i.conclusao !== 'nao_reagente') ? 'perigo' : 'sucesso',
                    titulo: (
                      <Link to={`/testagens/${t.id}`} className="text-primary hover:underline">
                        {MOTIVO_ROTULO[t.motivo]}
                        {t.gestante ? ' (gestante)' : ''}
                      </Link>
                    ),
                    descricao: <ResultadosResumo t={t} />,
                  }))}
                />
              )}
            </CardBody>
          </Card>
        </div>

        <Card aria-labelledby="t-cad" className="self-start">
          <CardHeader
            id="t-cad"
            titulo="Cadastro"
            acoes={
              <button
                type="button"
                onClick={() => setRevelar((r) => !r)}
                aria-pressed={revelar}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-primary hover:bg-primary-soft"
              >
                {revelar ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                {revelar ? 'Ocultar documentos' : 'Mostrar documentos'}
              </button>
            }
          />
          <CardBody>
            <DescricaoLista
              colunas={1}
              itens={[
                { rotulo: 'Nome civil', valor: p.nome },
                { rotulo: 'Nascimento', valor: formatarData(p.dataNascimento) },
                { rotulo: 'CNS', valor: <span className="tabular">{revelar ? formatarCns(p.cns) : mascararDocumento(p.cns)}</span> },
                { rotulo: 'CPF', valor: <span className="tabular">{revelar ? formatarCpf(p.cpf) : mascararDocumento(p.cpf)}</span> },
                { rotulo: 'Nome da mãe', valor: p.nomeMae ?? <Badge tom="atencao">Não informado</Badge> },
                { rotulo: 'Raça/cor', valor: p.racaCor === 'ignorado' ? <Badge tom="atencao">Ignorado</Badge> : RACA_ROTULO[p.racaCor] },
                { rotulo: 'Escolaridade', valor: p.escolaridade === 'ignorado' ? <Badge tom="atencao">Ignorado</Badge> : ESCOLARIDADE_ROTULO[p.escolaridade] },
                { rotulo: 'Telefone', valor: p.telefone ? <a className="text-primary hover:underline" href={`tel:${p.telefone}`}>{formatarTelefone(p.telefone)}</a> : <Badge tom="atencao">Não informado</Badge> },
                { rotulo: 'Endereço', valor: `${p.endereco.logradouro}, ${p.endereco.numero}${p.endereco.complemento ? ` (${p.endereco.complemento})` : ''} — ${p.endereco.bairro}` },
                { rotulo: 'Microárea', valor: microarea?.descricao ?? 'Fora de área' },
              ]}
            />
            <p className="mt-4 text-xs text-muted">O acesso a este cadastro foi registrado na auditoria (LGPD).</p>
          </CardBody>
        </Card>
      </div>
    </>
  )
}
