import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useSessaoAtiva } from '@/app/sessao'
import { ICONE } from '@/components/icones'
import { Button } from '@/components/ui/Button'
import { Aviso } from '@/components/ui/Feedback'
import { Checkbox, Field, GrupoCampos, Input, Select } from '@/components/ui/Form'
import type { PessoaInput } from '@/data/api'
import { useReferencias } from '@/data/hooks'
import { validarCns, validarCpf } from '@/domain/rules/documentos'
import { ESCOLARIDADE_ROTULO, RACA_ROTULO, SEXO_ROTULO } from '@/domain/rotulos'
import type { Escolaridade, Pessoa, RacaCor, Sexo } from '@/domain/types'
import { diasEntre, hojeISO } from '@/lib/datas'

const digitos = (v: string) => v.replace(/\D/g, '')

const esquema = z
  .object({
    nome: z
      .string()
      .trim()
      .min(1, 'Informe o nome.')
      .refine((v) => v.split(/\s+/).length >= 2, 'Informe nome e sobrenome.'),
    nomeSocial: z.string().trim().optional(),
    dataNascimento: z
      .string()
      .min(1, 'Informe a data de nascimento.')
      .refine((v) => v <= hojeISO(), 'A data não pode estar no futuro.'),
    sexo: z.enum(['F', 'M', 'I'], { errorMap: () => ({ message: 'Selecione o sexo.' }) }),
    cns: z
      .string()
      .optional()
      .refine((v) => !v || validarCns(v), 'CNS inválido: confira os 15 dígitos.'),
    cpf: z
      .string()
      .optional()
      .refine((v) => !v || validarCpf(v), 'CPF inválido: confira os dígitos.'),
    nomeMae: z.string().trim().optional(),
    racaCor: z.string().min(1, 'Selecione (use "Ignorado" só se a pessoa não quiser declarar).'),
    escolaridade: z.string().min(1, 'Selecione (use "Ignorado" só se a pessoa não souber informar).'),
    telefone: z
      .string()
      .optional()
      .refine((v) => !v || [10, 11].includes(digitos(v).length), 'Telefone com DDD: 10 ou 11 dígitos.'),
    logradouro: z.string().trim().min(1, 'Informe o logradouro.'),
    numero: z.string().trim().min(1, 'Informe o número (ou "s/n").'),
    bairro: z.string().trim().min(1, 'Informe o bairro.'),
    complemento: z.string().optional(),
    microareaId: z.string().optional(),
    gestante: z.boolean(),
    dum: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.gestante && v.sexo !== 'F') {
      ctx.addIssue({ code: 'custom', path: ['gestante'], message: 'Gestação só pode ser marcada para sexo feminino.' })
    }
    if (v.gestante && v.dum) {
      const dias = diasEntre(v.dum, hojeISO())
      if (dias < 0) ctx.addIssue({ code: 'custom', path: ['dum'], message: 'A DUM não pode estar no futuro.' })
      else if (dias > 300) ctx.addIssue({ code: 'custom', path: ['dum'], message: 'DUM há mais de 42 semanas: confira a data.' })
    }
  })

type Valores = z.infer<typeof esquema>

function paraValores(p?: Pessoa): Valores {
  return {
    nome: p?.nome ?? '',
    nomeSocial: p?.nomeSocial ?? '',
    dataNascimento: p?.dataNascimento ?? '',
    sexo: (p?.sexo ?? '') as Sexo,
    cns: p?.cns ?? '',
    cpf: p?.cpf ?? '',
    nomeMae: p?.nomeMae ?? '',
    racaCor: p?.racaCor ?? '',
    escolaridade: p?.escolaridade ?? '',
    telefone: p?.telefone ?? '',
    logradouro: p?.endereco.logradouro ?? '',
    numero: p?.endereco.numero ?? '',
    bairro: p?.endereco.bairro ?? '',
    complemento: p?.endereco.complemento ?? '',
    microareaId: p?.microareaId ?? '',
    gestante: p?.gestante ?? false,
    dum: p?.dum ?? '',
  }
}

export function paraPessoaInput(v: Valores): PessoaInput {
  return {
    nome: v.nome.trim(),
    nomeSocial: v.nomeSocial?.trim() || undefined,
    dataNascimento: v.dataNascimento,
    sexo: v.sexo,
    cns: v.cns ? digitos(v.cns) : undefined,
    cpf: v.cpf ? digitos(v.cpf) : undefined,
    nomeMae: v.nomeMae?.trim() || undefined,
    racaCor: v.racaCor as RacaCor,
    escolaridade: v.escolaridade as Escolaridade,
    telefone: v.telefone ? digitos(v.telefone) : undefined,
    endereco: { logradouro: v.logradouro, numero: v.numero, bairro: v.bairro, complemento: v.complemento || undefined },
    microareaId: v.microareaId || undefined,
    gestante: v.gestante,
    dum: v.gestante ? v.dum || undefined : undefined,
  }
}

/**
 * Formulário de cadastro. Agrupado em blocos (Gestalt proximidade) na ordem da ficha de
 * notificação, para que o cadastro já nasça completo. Campos de qualidade (raça/cor,
 * escolaridade) exigem escolha explícita — "Ignorado" precisa ser selecionado de propósito.
 */
export function PessoaFormulario({
  pessoa,
  aoSalvar,
  aoCancelar,
  salvando,
  rotuloSalvar = 'Salvar cadastro',
}: {
  pessoa?: Pessoa
  aoSalvar: (dados: PessoaInput) => void | Promise<void>
  aoCancelar?: () => void
  salvando?: boolean
  rotuloSalvar?: string
}) {
  const { usuario } = useSessaoAtiva()
  const refs = useReferencias()
  const microareas = refs.data?.microareas.filter((m) => m.ubsId === usuario.ubsId) ?? []
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitted },
  } = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: paraValores(pessoa) })
  const sexo = useWatch({ control, name: 'sexo' })
  const gestante = useWatch({ control, name: 'gestante' })
  const qtdErros = Object.keys(errors).length


  return (
    <form onSubmit={handleSubmit((v) => aoSalvar(paraPessoaInput(v)))} noValidate className="flex flex-col gap-5">
      {isSubmitted && qtdErros > 0 && (
        <Aviso tom="perigo" titulo={qtdErros === 1 ? 'Corrija o campo destacado para continuar.' : `Corrija os ${qtdErros} campos destacados para continuar.`} />
      )}
      <p className="text-sm text-muted">
        Campos com <span className="text-danger">*</span> são obrigatórios.
      </p>

      <GrupoCampos legenda="Identificação">
        <Field label="Nome completo" obrigatorio erro={errors.nome?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register('nome')} />
        </Field>
        <Field label="Nome social" dica="Como a pessoa prefere ser chamada." erro={errors.nomeSocial?.message}>
          <Input autoComplete="off" {...register('nomeSocial')} />
        </Field>
        <Field label="Data de nascimento" obrigatorio erro={errors.dataNascimento?.message}>
          <Input type="date" max={hojeISO()} {...register('dataNascimento')} />
        </Field>
        <Field label="Sexo" obrigatorio erro={errors.sexo?.message}>
          <Select {...register('sexo')}>
            <option value="">Selecione…</option>
            {Object.entries(SEXO_ROTULO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nome da mãe" dica="Exigido na notificação." erro={errors.nomeMae?.message}>
          <Input autoComplete="off" {...register('nomeMae')} />
        </Field>
        <Field label="Cartão Nacional de Saúde (CNS)" dica="15 dígitos." erro={errors.cns?.message}>
          <Input inputMode="numeric" className="tabular" maxLength={18} {...register('cns')} />
        </Field>
        <Field label="CPF" dica="Se não houver CNS." erro={errors.cpf?.message}>
          <Input inputMode="numeric" className="tabular" maxLength={14} {...register('cpf')} />
        </Field>
      </GrupoCampos>

      <GrupoCampos legenda="Dados para a vigilância">
        <Field label="Raça/cor (autodeclarada)" obrigatorio erro={errors.racaCor?.message}>
          <Select {...register('racaCor')}>
            <option value="">Selecione…</option>
            {Object.entries(RACA_ROTULO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Escolaridade" obrigatorio erro={errors.escolaridade?.message}>
          <Select {...register('escolaridade')}>
            <option value="">Selecione…</option>
            {Object.entries(ESCOLARIDADE_ROTULO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
      </GrupoCampos>

      <GrupoCampos legenda="Contato e endereço">
        <Field label="Telefone com DDD" dica="Essencial para a busca ativa." erro={errors.telefone?.message}>
          <Input type="tel" inputMode="tel" autoComplete="off" {...register('telefone')} />
        </Field>
        <Field label="Microárea" dica="Define qual ACS fará a busca ativa.">
          <Select {...register('microareaId')}>
            <option value="">Fora de área / não definida</option>
            {microareas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.descricao}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Logradouro" obrigatorio erro={errors.logradouro?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register('logradouro')} />
        </Field>
        <Field label="Número" obrigatorio erro={errors.numero?.message}>
          <Input autoComplete="off" {...register('numero')} />
        </Field>
        <Field label="Complemento">
          <Input autoComplete="off" {...register('complemento')} />
        </Field>
        <Field label="Bairro" obrigatorio erro={errors.bairro?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register('bairro')} />
        </Field>
      </GrupoCampos>

      {sexo === 'F' && (
        <GrupoCampos
          legenda={
            <span className="inline-flex items-center gap-2">
              <ICONE.gestante className="size-5 text-accent" aria-hidden /> Gestação
            </span>
          }
        >
          <Checkbox
            label="Gestante"
            descricao="Gestantes têm prioridade: sífilis reagente é tratada no mesmo dia."
            className="sm:col-span-2"
            {...register('gestante')}
          />
          {errors.gestante && <p className="text-sm font-bold text-danger">{errors.gestante.message}</p>}
          {gestante && (
            <Field label="Data da última menstruação (DUM)" dica="Exigida na notificação de sífilis em gestante." erro={errors.dum?.message}>
              <Input type="date" max={hojeISO()} {...register('dum')} />
            </Field>
          )}
        </GrupoCampos>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {aoCancelar && (
          <Button variante="secundario" onClick={aoCancelar}>
            Cancelar
          </Button>
        )}
        <Button type="submit" carregando={salvando}>
          {rotuloSalvar}
        </Button>
      </div>
    </form>
  )
}
