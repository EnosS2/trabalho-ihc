import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Acessibilidade } from '@/app/layout/Acessibilidade'
import { AlternarTema } from '@/app/layout/AlternarTema'
import { Logo } from '@/app/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Aviso, Carregando } from '@/components/ui/Feedback'
import { Field, Input } from '@/components/ui/Form'
import { useAcessosDemo, useEntrarComCredenciais, useSessao } from '@/data/hooks'
import { NIVEL_ACESSO } from '@/domain/permissoes'
import { PERFIL_ROTULO } from '@/domain/rotulos'

/** Rota /entrar: login fictício (e-mail + senha validados pela API mock), com os acessos de demonstração ao lado. */
export default function LoginPage() {
  const sessao = useSessao()
  const acessos = useAcessosDemo()
  const entrar = useEntrarComCredenciais()
  const navegar = useNavigate()
  const local = useLocation()
  const destino = (local.state as { de?: string } | null)?.de ?? '/'

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [tentou, setTentou] = useState(false)
  const [avisoGovBr, setAvisoGovBr] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  useEffect(() => {
    document.title = 'Entrar · Testagem UBS'
  }, [])

  if (sessao.data) return <Navigate to={destino} replace />

  const erroEmail = tentou && !email.trim() ? 'Informe seu e-mail.' : undefined
  const erroSenha = tentou && !senha ? 'Informe sua senha.' : undefined

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (!email.trim() || !senha) return
    try {
      await entrar.mutateAsync({ email, senha })
      navegar(destino, { replace: true })
    } catch {
      /* a mensagem aparece no aviso acima do botão */
    }
  }

  function usarAcesso(a: { email: string; senha: string }) {
    setEmail(a.email)
    setSenha(a.senha)
    setTentou(false)
    entrar.reset()
    formulario.current?.querySelector<HTMLButtonElement>('button[type=submit]')?.focus()
  }

  return (
    <div className="min-h-dvh bg-bg">
      <div className="bg-sidebar px-4 pt-6 pb-28 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <Logo claro />
            <div className="flex items-center gap-1">
              <AlternarTema />
              <Acessibilidade abrirPara="baixo" />
            </div>
          </div>
          <h1 className="mt-8 max-w-2xl text-3xl font-bold text-white sm:text-4xl">
            Da testagem ao tratamento, sem perder ninguém no caminho.
          </h1>
        </div>
      </div>

      <main id="conteudo" className="mx-auto -mt-20 max-w-5xl px-4 pb-12 sm:px-8">
        <div className="grid gap-6 rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
          <section aria-labelledby="titulo-entrar">
            <h2 id="titulo-entrar" className="text-2xl font-bold">
              Entrar
            </h2>
            <p className="mb-5 text-muted">Use seu e-mail institucional e sua senha.</p>

            <form ref={formulario} noValidate onSubmit={enviar} className="flex flex-col gap-4">
              <Field label="E-mail" erro={erroEmail} obrigatorio>
                <Input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome.sobrenome@demo.poa"
                />
              </Field>
              <Field label="Senha" erro={erroSenha} obrigatorio>
                <CampoSenha value={senha} onChange={setSenha} />
              </Field>

              {entrar.isError && (
                <div role="alert">
                  <Aviso tom="perigo" titulo="Não foi possível entrar">
                    {entrar.error.message}
                  </Aviso>
                </div>
              )}

              <Button type="submit" tamanho="lg" icone={LogIn} carregando={entrar.isPending}>
                Entrar
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-sm font-bold text-muted" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              tamanho="lg"
              variante="fantasma"
              className="w-full border border-primary"
              aria-label="Entrar com gov.br"
              onClick={() => setAvisoGovBr(true)}
            >
              Entrar com <MarcaGovBr />
            </Button>
            <div aria-live="polite">
              {avisoGovBr && (
                <Aviso tom="info" className="mt-3" titulo="gov.br ainda não está disponível">
                  O login pelo gov.br fica para a versão final. Neste protótipo, entre com um dos acessos de demonstração.
                </Aviso>
              )}
            </div>
          </section>

          <section aria-labelledby="titulo-acessos" className="border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <h2 id="titulo-acessos" className="text-xl font-bold">
              Acessos de demonstração
            </h2>
            <p className="mb-4 text-sm text-muted">
              Cada perfil vê uma interface e um nível de acesso diferentes. Escolha um para preencher o formulário.
            </p>
            {acessos.isLoading && <Carregando texto="Carregando acessos…" />}
            <ul className="flex flex-col gap-2">
              {acessos.data?.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="font-bold">
                      {PERFIL_ROTULO[a.perfil]}{' '}
                      <span className="text-xs font-normal text-muted">nível {NIVEL_ACESSO[a.perfil].nivel}</span>
                    </p>
                    <p className="truncate text-sm text-muted">{a.nome}</p>
                    <p className="mt-1 font-mono text-sm break-all">{a.email}</p>
                    <p className="text-sm whitespace-nowrap">
                      <span className="text-muted">Senha: </span>
                      <span className="font-mono">{a.senha}</span>
                    </p>
                  </div>
                  <Button variante="sutil" tamanho="sm" onClick={() => usarAcesso(a)}>
                    Usar este acesso
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <Aviso tom="info" className="mt-6" titulo="Dados fictícios">
          Todas as pessoas, unidades, usuários e senhas foram gerados para demonstração e não correspondem a pessoas
          reais. Os dados ficam apenas no seu navegador.
        </Aviso>
      </main>
    </div>
  )
}

/** Senha com botão de mostrar/ocultar. Recebe do <Field> o id e os atributos aria e os repassa ao input. */
function CampoSenha({
  value,
  onChange,
  ...aria
}: { value: string; onChange: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="relative">
      <Input
        {...aria}
        type={visivel ? 'text' : 'password'}
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-12"
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-pressed={visivel}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted hover:text-fg"
      >
        {visivel ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  )
}

/** Marca gov.br em texto, nas cores do padrão de botão de login do governo federal. */
function MarcaGovBr() {
  return (
    <span className="text-lg font-extrabold tracking-tight" aria-hidden>
      <span className="text-[#1351b4] dark:text-[#5992ed]">g</span>
      <span className="text-[#f2b705]">o</span>
      <span className="text-[#168821] dark:text-[#2fb344]">v</span>
      <span className="text-[#1351b4] dark:text-[#5992ed]">.br</span>
    </span>
  )
}
