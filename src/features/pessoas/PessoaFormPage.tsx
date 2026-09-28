import { useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router'
import { Card, CardBody } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Carregando, EstadoErro } from '@/components/ui/Feedback'
import { PageHeader } from '@/components/ui/Layout'
import { useToast } from '@/components/ui/Toast'
import { usePessoa, useSalvarPessoa } from '@/data/hooks'
import { PessoaFormulario } from './PessoaFormulario'
import { nomeDeExibicao } from '@/domain/rules/pessoa'

export default function PessoaFormPage() {
  const { id } = useParams()
  const existente = usePessoa(id)
  const salvar = useSalvarPessoa()
  const navegar = useNavigate()
  const toast = useToast()
  const [alterado, setAlterado] = useState(false)
  // Depois de salvar, a navegação para o cadastro não deve pedir confirmação.
  const salvo = useRef(false)
  const bloqueio = useBlocker(({ currentLocation, nextLocation }) => alterado && !salvo.current && currentLocation.pathname !== nextLocation.pathname)

  if (id && existente.isLoading) return <Carregando />
  if (id && existente.error) return <EstadoErro erro={existente.error} />
  const pessoa = existente.data?.pessoa

  return (
    <>
      <PageHeader
        titulo={pessoa ? `Editar ${nomeDeExibicao(pessoa)}` : 'Cadastrar pessoa'}
        tituloAba={pessoa ? 'Editar cadastro' : 'Cadastrar pessoa'}
        descricao="Um cadastro completo hoje evita notificação incompleta amanhã."
        trilha={[
          { rotulo: 'Pessoas', para: '/pessoas' },
          ...(pessoa ? [{ rotulo: nomeDeExibicao(pessoa), para: `/pessoas/${pessoa.id}` }] : []),
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
            aoMudarAlteracoes={setAlterado}
            aoSalvar={async (dados) => {
              try {
                const p = await salvar.mutateAsync({ dados, id })
                toast.sucesso(id ? 'Cadastro atualizado.' : 'Pessoa cadastrada.')
                salvo.current = true
                navegar(`/pessoas/${p.id}`)
              } catch (e) {
                toast.erro(e)
              }
            }}
          />
        </CardBody>
      </Card>
      <ConfirmDialog
        aberto={bloqueio.state === 'blocked'}
        aoFechar={() => bloqueio.reset?.()}
        aoConfirmar={() => bloqueio.proceed?.()}
        perigo
        titulo="Sair sem salvar o cadastro?"
        mensagem="O que foi preenchido nesta tela será perdido."
        rotuloConfirmar="Sair sem salvar"
        rotuloCancelar="Continuar editando"
      />
    </>
  )
}
