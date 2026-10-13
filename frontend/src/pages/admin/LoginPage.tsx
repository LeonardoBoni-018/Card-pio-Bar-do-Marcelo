import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { login } from '../../api/endpoints'
import { session, useIsAuthenticated } from '../../auth/session'
import { LogoFull } from '../../components/Logo'
import { Button } from '../../components/ui/Button'
import { Field, describedBy, inputClass } from '../../components/ui/Field'

const schema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.'),
  password: z.string().min(1, 'Informe a senha.'),
})
type Values = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const authenticated = useIsAuthenticated()
  const [expired] = useState(() => session.consumeExpiredNotice())
  const [showPassword, setShowPassword] = useState(false)
  const from = (location.state as { from?: string } | null)?.from ?? '/admin/items'

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) })

  const mutation = useMutation({
    mutationFn: (values: Values) => login(values.username.trim(), values.password),
    onSuccess: (data) => {
      session.set(data.accessToken)
      navigate(from, { replace: true })
    },
  })

  if (authenticated) return <Navigate to={from} replace />

  return (
    <div className="min-h-dvh bg-brasa-600 px-4 py-6 sm:grid sm:place-items-center">
      <main className="mx-auto w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <LogoFull className="mx-auto h-36 w-auto" />
        <h1 className="mt-4 text-center text-2xl font-extrabold">Área do proprietário</h1>
        <p className="mt-1 text-center text-tinta-500">Entre para editar o cardápio.</p>

        {expired && !mutation.isError && (
          <p role="status" className="mt-4 rounded-lg bg-laranja-100 px-3 py-2 text-sm font-semibold text-tinta-900">
            Sua sessão expirou. Entre novamente.
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="mt-4 rounded-lg bg-brasa-50 px-3 py-2 text-sm font-semibold text-brasa-700">
            {mutation.error.message}
          </p>
        )}

        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="mt-6 space-y-4">
          <Field id="username" label="Usuário" error={errors.username?.message}>
            <input
              id="username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={!!errors.username}
              aria-describedby={describedBy('username', errors.username?.message)}
              className={inputClass}
              {...register('username')}
            />
          </Field>
          <Field id="password" label="Senha" error={errors.password?.message}>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={!!errors.password}
                aria-describedby={describedBy('password', errors.password?.message)}
                className={`${inputClass} pr-24`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded-lg px-3 text-sm font-bold text-ceu-700"
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </Field>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-ceu-700 underline underline-offset-4">
            Voltar ao cardápio
          </Link>
        </p>
      </main>
    </div>
  )
}
