import type { ReactNode } from 'react'

export const inputClass =
  'block w-full rounded-lg border border-tinta-300 bg-white px-3 py-2.5 text-base text-tinta-900 placeholder:text-tinta-500 aria-[invalid=true]:border-brasa-600 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-brasa-600 min-h-12 md:min-h-11'

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** Rótulo + controle + dica/erro ligados por aria-describedby. O controle deve usar `id` e `aria-describedby={describedBy(id)}`. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold text-tinta-700">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-sm text-tinta-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm font-semibold text-brasa-700">
          {error}
        </p>
      )}
    </div>
  )
}

export const describedBy = (id: string, error?: string, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined)
