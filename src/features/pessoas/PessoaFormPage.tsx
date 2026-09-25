import { useNavigate, useParams } from 'react-router'
import { Card, CardBody } from '@/components/ui/Card'
import { Carregando, EstadoErro } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { usePessoa, useSalvarPessoa } from '@/data/hooks'
import { PessoaFormulario } from './PessoaFormulario'

export default function PessoaFormPage() {
  const { id } = useParams()
  const existente = usePessoa(id)
  const salvar = useSalvarPessoa()
  const navegar = useNavigate()
  const toast = useToast()

  if (id && existente.isLoading) return <Carregando />
  if (id && existente.error) return <EstadoErro erro={existente.error} />
  const pessoa = existente.data?.pessoa

  return (
    <>
      <PageHeader
        titulo={pessoa ? `Editar ${pessoa.nome}` : 'Cadastrar pessoa'}
        tituloAba={pessoa ? 'Editar cadastro' : 'Cadastrar pessoa'}
        descricao="Um cadastro completo hoje evita notificação incompleta amanhã."
        trilha={[
          { rotulo: 'Pessoas', para: '/pessoas' },
          ...(pessoa ? [{ rotulo: pessoa.nome, para: `/pessoas/${pessoa.id}` }] : []),
          { rotulo: pessoa ? 'Editar' : 'Novo cadastro' },
        ]}
      />
      <Card className="max-w-4xl">
        <CardBody className="pt-5">
          <PessoaFormulario
            key={pessoa?.id ?? 'nova'}
            pessoa={pessoa}
            salvando={salvar.isPending}
            aoCancelar={() => navegar(-1)}
            aoSalvar={async (dados) => {
              try {
                const p = await salvar.mutateAsync({ dados, id })
                toast.sucesso(id ? 'Cadastro atualizado.' : 'Pessoa cadastrada.')
                navegar(`/pessoas/${p.id}`)
              } catch (e) {
                toast.erro(e)
              }
            }}
          />
        </CardBody>
      </Card>
    </>
  )
}
