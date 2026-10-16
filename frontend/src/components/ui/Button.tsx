import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { Dot } from './Spinner'

type Variant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost'

const base =
  'press inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 md:min-h-11 md:rounded-lg md:px-4 md:text-sm'

const variants: Record<Variant, string> = {
  primary: 'bg-brasa-600 text-white active:bg-brasa-800 md:hover:bg-brasa-700',
  accent: 'bg-laranja-500 text-tinta-900 active:bg-laranja-600 md:hover:bg-laranja-600',
  secondary: 'bg-white text-tinta-900 ring-1 ring-tinta-300 hover:bg-brasa-50',
  danger: 'bg-brasa-800 text-white hover:bg-tinta-900',
  ghost: 'text-brasa-700 hover:bg-brasa-50',
}

export const buttonClass = (variant: Variant = 'primary') => `${base} ${variants[variant]}`

/** `loading` mostra uma rodinha, desabilita o botão e avisa leitores de tela (o texto continua o mesmo). */
export function Button({ variant = 'primary', className = '', type = 'button', loading = false, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button type={type} className={`${buttonClass(variant)} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Dot />}
      {children}
    </button>
  )
}

export function LinkButton({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={`${buttonClass(variant)} ${className}`} {...props} />
}
