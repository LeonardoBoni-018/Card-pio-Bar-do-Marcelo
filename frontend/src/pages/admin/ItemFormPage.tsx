import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { z } from 'zod'
import { ApiError } from '../../api/client'
import { createItem, updateItem } from '../../api/endpoints'
import { keys, useAdminItem, useCategories } from '../../api/queries'
import type { AdminItem, Category, ItemInput } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { Button } from '../../components/ui/Button'
import { Field, describedBy, inputClass } from '../../components/ui/Field'
import { Spinner } from '../../components/ui/Spinner'
import { Switch } from '../../components/ui/Switch'
import { useToast } from '../../components/ui/Toast'
import { parsePrice, priceToInput } from '../../lib/format'
import { ImageUpload } from './ImageUpload'

const schema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do item.').max(100, 'Use no máximo 100 caracteres.'),
  description: z.string().max(500, 'Use no máximo 500 caracteres.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preço.')
    .refine((v) => parsePrice(v) !== null, 'Preço inválido. Use números, por exemplo 8,50.')
    .refine((v) => (parsePrice(v) ?? 0) <= 99_999_999.99, 'Preço alto demais.'),
  categoryId: z.string().min(1, 'Escolha uma categoria.'),
  available: z.boolean(),
  featured: z.boolean(),
  imageFilename: z.string().nullable(),
})
type Values = z.infer<typeof schema>

const toValues = (item?: AdminItem): Values => ({
  name: item?.name ?? '',
  description: item?.description ?? '',
  price: item ? priceToInput(item.price) : '',
  categoryId: item ? String(item.categoryId) : '',
  available: item?.available ?? true,
  featured: item?.featured ?? false,
  imageFilename: item?.imageFilename ?? null,
})

/** `item` = edição; `template` = cópia de outro item (cadastro novo com os campos preenchidos, sem a foto). */
function ItemForm({ item, template, categories }: { item?: AdminItem; template?: AdminItem; categories: Category[] }) {
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: item ? toValues(item) : template ? { ...toValues(template), name: `${template.name} (cópia)`, imageFilename: null } : toValues() })

  const save = useMutation({
    mutationFn: (values: Values) => {
      const input: ItemInput = {
        name: values.name.trim(),
        description: values.description.trim(),
        price: parsePrice(values.price) as number,
        categoryId: Number(values.categoryId),
        imageFilename: values.imageFilename,
        available: values.available,
        featured: values.featured,
      }
      return item ? updateItem(item.id, input) : createItem(input)
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: keys.items })
      void queryClient.invalidateQueries({ queryKey: keys.menu })
      toast.success(item ? `“${saved.name}” foi atualizado.` : `“${saved.name}” foi adicionado ao cardápio.`)
      navigate('/admin/items')
    },
    onError: (error: ApiError) => {
      const fields = Object.entries(error.fieldErrors).filter(([field]) => field in schema.shape)
      fields.forEach(([field, message]) => setError(field as keyof Values, { message }))
      if (fields.length === 0) toast.error(error.message)
    },
  })

  const description = useWatch({ control, name: 'description' })

  return (
    <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="mt-5 grid gap-6 md:grid-cols-[18rem_1fr]">
      <Controller
        control={control}
        name="imageFilename"
        render={({ field }) => (
          <ImageUpload filename={field.value} currentUrl={item?.imageUrl ?? null} onChange={field.onChange} onBusyChange={setUploading} />
        )}
      />

      <div className="space-y-5">
        <Field id="name" label="Nome" error={errors.name?.message}>
          <input id="name" aria-invalid={!!errors.name} aria-describedby={describedBy('name', errors.name?.message)} className={inputClass} {...register('name')} />
        </Field>

        <Field id="description" label="Descrição" error={errors.description?.message} hint={`${description.length}/500 caracteres. Ex.: ingredientes, tamanho, quantas pessoas serve.`}>
          <textarea
            id="description"
            rows={3}
            aria-invalid={!!errors.description}
            aria-describedby={describedBy('description', errors.description?.message, 'x')}
            className={inputClass}
            {...register('description')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="price" label="Preço (R$)" error={errors.price?.message}>
            <input
              id="price"
              inputMode="decimal"
              placeholder="0,00"
              aria-invalid={!!errors.price}
              aria-describedby={describedBy('price', errors.price?.message)}
              className={inputClass}
              {...register('price')}
            />
          </Field>
          <Field id="categoryId" label="Categoria" error={errors.categoryId?.message}>
            <select
              id="categoryId"
              aria-invalid={!!errors.categoryId}
              aria-describedby={describedBy('categoryId', errors.categoryId?.message)}
              className={inputClass}
              {...register('categoryId')}
            >
              <option value="">Escolha…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-8">
          <Controller
            control={control}
            name="available"
            render={({ field }) => (
              <label className="flex items-center gap-3 font-bold">
                <Switch checked={field.value} onChange={field.onChange} label="Disponível no cardápio" />
                Disponível no cardápio
              </label>
            )}
          />
          <Controller
            control={control}
            name="featured"
            render={({ field }) => (
              <label className="flex items-center gap-3 font-bold">
                <Switch checked={field.value} onChange={field.onChange} label="Destacar item" />
                Destacar item
              </label>
            )}
          />
        </div>

        {/* no celular a barra de ações fica fixa embaixo: salvar está sempre ao alcance do polegar */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-brasa-100 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:static md:justify-end md:border-t md:px-0 md:pb-0 md:pt-5">
          <Link to="/admin/items" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl text-base font-bold text-brasa-700 ring-1 ring-tinta-300 md:min-h-11 md:flex-none md:px-4 md:text-sm md:ring-0 md:hover:bg-brasa-50">
            Cancelar
          </Link>
          <Button type="submit" className="flex-[2] md:flex-none" loading={save.isPending || uploading}>
            {save.isPending ? 'Salvando…' : uploading ? 'Enviando foto…' : 'Salvar item'}
          </Button>
        </div>
      </div>
    </form>
  )
}

export default function ItemFormPage() {
  const { id } = useParams()
  const itemId = id ? Number(id) : undefined
  const copyId = Number(useSearchParams()[0].get('copiar')) || undefined
  const query = useAdminItem(itemId ?? copyId)
  const categories = useCategories()

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/admin/items" className="inline-flex min-h-11 items-center text-base font-bold text-brasa-700 md:text-sm">
        ← Itens do cardápio
      </Link>
      <h1 className="text-3xl font-extrabold">{itemId ? 'Editar item' : copyId ? 'Duplicar item' : 'Novo item'}</h1>
      {/* o formulário só aparece com tudo pronto: o <select> de categoria precisa das opções para mostrar o valor salvo */}
      {(categories.isPending || (itemId !== undefined && query.isPending) || (copyId !== undefined && query.isPending)) && !categories.isError && !query.isError && <Spinner label="Carregando…" />}
      {categories.isError && (
        <div className="mt-6">
          <ErrorState message={categories.error.message} onRetry={() => void categories.refetch()} />
        </div>
      )}
      {(itemId ?? copyId) !== undefined && query.isError && (
        <div className="mt-6">
          <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />
        </div>
      )}
      {categories.data && ((itemId === undefined && copyId === undefined) || query.data) && (
        <ItemForm key={itemId ?? `copia-${copyId ?? 'novo'}`} item={itemId ? query.data : undefined} template={copyId ? query.data : undefined} categories={categories.data} />
      )}
    </div>
  )
}
