import { Search, UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { usePode } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { Badge, GestanteBadge } from '@/components/ui/Badge'
import { LinkButton } from '@/components/ui/Button'
import { Card, CardBody } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { Carregando, EstadoErro, EstadoVazio } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { PageHeader } from '@/components/ui/Layout'
import { usePessoas } from '@/data/hooks'
import { mascararDocumento } from '@/domain/rules/documentos'
import { formatarData } from '@/lib/datas'

export default function PessoasPage() {
  const podeEditar = usePode('pessoa.editar')
  const [termo, setTermo] = useState('')
  const [busca, setBusca] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setBusca(termo), 250)
    return () => clearTimeout(t)
  }, [termo])
  const { data, isLoading, error, refetch } = usePessoas(busca)

  return (
    <>
      <PageHeader
        titulo="Pessoas"
        descricao="Usuários do SUS atendidos na UBS. Documentos aparecem mascarados nas listas (LGPD)."
        acoes={
          podeEditar && (
            <LinkButton to="/pessoas/nova" icone={UserPlus}>
              Cadastrar pessoa
            </LinkButton>
          )
        }
      />
      <Card>
        <CardBody className="pt-5">
          <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4 max-w-xl">
            <Field label="Buscar por nome, CNS ou CPF">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden />
                <Input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} className="pl-10" />
              </div>
            </Field>
          </form>
          <p className="sr-only" aria-live="polite">
            {data ? `${data.length} resultado(s)` : ''}
          </p>
          {isLoading && <Carregando />}
          {error && <EstadoErro erro={error} tentarNovamente={refetch} />}
          {data && (
            <DataTable
              legenda="Pessoas cadastradas"
              linhas={data}
              chave={(l) => l.pessoa.id}
              principal={(l) => (
                <Link to={`/pessoas/${l.pessoa.id}`} className="font-bold text-primary hover:underline">
                  {l.pessoa.nomeSocial ?? l.pessoa.nome}
                </Link>
              )}
              vazio={
                <EstadoVazio
                  icone={ICONE.pessoas}
                  titulo="Nenhuma pessoa encontrada"
                  descricao="Confira a grafia ou o número do documento."
                  acao={podeEditar && <LinkButton to="/pessoas/nova" icone={UserPlus}>Cadastrar pessoa</LinkButton>}
                />
              }
              colunas={[
                {
                  chave: 'nome',
                  cabecalho: 'Nome',
                  ocultarMobile: true,
                  celula: (l) => (
                    <Link to={`/pessoas/${l.pessoa.id}`} className="font-bold text-primary hover:underline">
                      {l.pessoa.nomeSocial ?? l.pessoa.nome}
                    </Link>
                  ),
                },
                { chave: 'idade', cabecalho: 'Idade', celula: (l) => `${l.idade} anos`, className: 'tabular' },
                { chave: 'cns', cabecalho: 'CNS', celula: (l) => <span className="font-mono text-xs">{mascararDocumento(l.pessoa.cns)}</span> },
                {
                  chave: 'situacao',
                  cabecalho: 'Situação',
                  celula: (l) => (
                    <span className="flex flex-wrap gap-1">
                      {l.pessoa.gestante && <GestanteBadge />}
                      {l.casosAtivos > 0 ? (
                        <Badge tom="info" icone={ICONE.seguimento}>
                          {l.casosAtivos} em seguimento
                        </Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </span>
                  ),
                },
                { chave: 'ultima', cabecalho: 'Última testagem', celula: (l) => formatarData(l.ultimaTestagem), className: 'tabular' },
              ]}
            />
          )}
        </CardBody>
      </Card>
    </>
  )
}
