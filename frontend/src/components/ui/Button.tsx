import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 min-h-11'

const variants: Record<Variant, string> = {
  primary: 'bg-brasa-600 text-white hover:bg-brasa-700',
  secondary: 'bg-white text-tinta-900 ring-1 ring-tinta-300 hover:bg-brasa-50',
  danger: 'bg-brasa-800 text-white hover:bg-tinta-900',
  ghost: 'text-ceu-700 hover:bg-brasa-50',
}

export const buttonClass = (variant: Variant = 'primary') => `${base} ${variants[variant]}`

export function Button({ variant = 'primary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${buttonClass(variant)} ${className}`} {...props} />
}

export function LinkButton({ variant = 'primary', className = '', ...props }: LinkProps & { variant?: Variant }) {
  return <Link className={`${buttonClass(variant)} ${className}`} {...props} />
}
