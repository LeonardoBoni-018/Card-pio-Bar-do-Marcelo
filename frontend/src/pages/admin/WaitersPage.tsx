import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { createWaiter, updateWaiter } from '../../api/endpoints'
import { keys, useWaiters } from '../../api/queries'
import type { Waiter } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, describedBy, inputClass } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cardClass, CardTitle } from '../../components/ui/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'

const USERNAME = /^[A-Za-z0-9._-]{3,30}$/

const base = {
  name: z.string().trim().min(1, 'Informe o nome.').max(60, 'Máximo de 60 caracteres.'),
  username: z.string().trim().regex(USERNAME, 'De 3 a 30 letras, números, ponto, hífen ou sublinhado, sem espaços.'),
}
const createSchema = z.object({ ...base, password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100) })
const editSchema = z.object({ ...base, password: z.union([z.literal(''), z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres.').max(100)]) })
type Values = z.infer<typeof createSchema>

/** Campos do formulário de garçom, usados para criar e para editar. */
function WaiterFields({ prefix, form, editing }: { prefix: string; form: ReturnType<typeof useForm<Values>>; editing: boolean }) {
  const [show, setShow] = useState(false)
  const { errors } = form.formState
  const id = (field: string) => `${prefix}-${field}`
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field id={id('nome')} label="Nome" error={errors.name?.message}>
        <input
          id={id('nome')}
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy(id('nome'), errors.name?.message)}
          className={inputClass}
          {...form.register('name')}
        />
      </Field>
      <Field id={id('usuario')} label="Usuário" error={errors.username?.message} hint="Usado para entrar. Ex.: joao">
        <input
          id={id('usuario')}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={!!errors.username}
          aria-describedby={describedBy(id('usuario'), errors.username?.message, 'hint')}
          className={inputClass}
          {...form.register('username')}
        />
      </Field>
      <Field
        id={id('senha')}
        label={editing ? 'Nova senha (opcional)' : 'Senha'}
        error={errors.password?.message}
        hint={editing ? 'Deixe vazio para manter.' : 'Mínimo de 6 caracteres.'}
      >
        <div className="relative">
          <input
            id={id('senha')}
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={describedBy(id('senha'), errors.password?.message, 'hint')}
            className={`${inputClass} pr-24`}
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={show}
            className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-3 text-sm font-bold text-brasa-700"
          >
            {show ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </Field>
    </div>
  )
}

function WaiterRow({ waiter }: { waiter: Waiter }) {
  const [editing, setEditing] = useState(false)
  const toast = useToast()
  const queryClient = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(editSchema), defaultValues: { name: waiter.name, username: waiter.username, password: '' } })

  const save = useMutation({
    mutationFn: (input: { name: string; username: string; password?: string; active: boolean }) => updateWaiter(waiter.id, input),
    onSuccess: (saved, input) => {
      toast.success(input.active !== waiter.active ? (saved.active ? `${saved.name} pode entrar de novo.` : `${saved.name} desativado: não entra mais.`) : 'Garçom atualizado.')
      setEditing(false)
      form.reset({ name: saved.name, username: saved.username, password: '' })
      void queryClient.invalidateQueries({ queryKey: keys.waiters })
    },
    onError: (error) => toast.error(error.message),
  })

  if (!editing) {
    return (
      <li className="flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 p-4">
        <span className="flex min-w-0 basis-full items-center gap-3 sm:basis-0 sm:flex-1">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-white ${waiter.active ? 'bg-brasa-600' : 'bg-tinta-300'}`} aria-hidden="true">
            <Icon name="user" />
          </span>
          <span className="min-w-0">
            <p className={`break-words text-lg font-extrabold ${waiter.active ? '' : 'text-tinta-500'}`}>{waiter.name}</p>
            <p className="text-sm text-tinta-500">
              Usuário <span className="font-bold text-tinta-700">{waiter.username}</span> · {waiter.active ? 'Ativo' : 'Desativado'}
            </p>
          </span>
        </span>
        <span className="mr-auto sm:mr-0">
          <Switch
            checked={waiter.active}
            onChange={(active) => save.mutate({ name: waiter.name, username: waiter.username, active })}
            label={`${waiter.name} pode entrar`}
            disabled={save.isPending}
          />
        </span>
        <Button variant="secondary" onClick={() => setEditing(true)} aria-label={`Editar ${waiter.name}`} className="gap-1.5">
          <Icon name="pencil" />
          Editar
        </Button>
      </li>
    )
  }

  return (
    <li className="p-4">
      <form
        noValidate
        onSubmit={form.handleSubmit((v) => save.mutate({ name: v.name, username: v.username, password: v.password || undefined, active: waiter.active }))}
        className="space-y-3"
      >
        <WaiterFields prefix={`garcom-${waiter.id}`} form={form} editing />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={save.isPending}>
            Salvar
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setEditing(false)
              form.reset()
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </li>
  )
}

export default function WaitersPage() {
  const waiters = useWaiters()
  const toast = useToast()
  const queryClient = useQueryClient()
  const form = useForm<Values>({ resolver: zodResolver(createSchema), defaultValues: { name: '', username: '', password: '' } })

  const add = useMutation({
    mutationFn: (v: Values) => createWaiter(v),
    onSuccess: (created) => {
      toast.success(`${created.name} cadastrado. Entra com o usuário “${created.username}”.`)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: keys.waiters })
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="space-y-5">
      <section aria-labelledby="titulo-novo-garcom" className={cardClass}>
        <CardTitle icon="plus" id="titulo-novo-garcom">
          Novo garçom
        </CardTitle>
        <form noValidate onSubmit={form.handleSubmit((v) => add.mutate(v))} className="space-y-3">
          <WaiterFields prefix="novo-garcom" form={form} editing={false} />
          <Button type="submit" loading={add.isPending} className="gap-1.5">
            <Icon name="plus" />
            Cadastrar
          </Button>
        </form>
        <p className="mt-3 flex items-start gap-2 text-sm text-tinta-500">
          <Icon name="info" className="mt-0.5 size-4" />O garçom entra pelo celular em {window.location.host}/garcom. Para cortar o acesso, desative (o histórico dele é mantido).
        </p>
      </section>

      <div>
        {waiters.isPending && <Spinner label="Carregando garçons…" />}
        {waiters.isError && <ErrorState message={waiters.error.message} onRetry={() => void waiters.refetch()} />}
        {waiters.data?.length === 0 && (
          <p className={`${cardClass} py-8 text-center text-tinta-700`}>
            <Icon name="user" className="mx-auto mb-2 size-8 text-brasa-700" />
            Nenhum garçom ainda. Cadastre o primeiro acima.
          </p>
        )}
        {waiters.data && waiters.data.length > 0 && (
          <ul aria-label="Garçons" className="divide-y divide-brasa-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brasa-100">
            {waiters.data.map((waiter) => (
              <WaiterRow key={waiter.id} waiter={waiter} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
