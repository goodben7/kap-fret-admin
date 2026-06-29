import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Banknote } from 'lucide-react'
import { useCurrency, useCreateCurrency, useUpdateCurrency } from '@/hooks/useCurrencies'
import { CurrencyForm } from '@/components/forms/CurrencyForm'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { currencyToFormDefaults, toCurrencyPayload } from '@/lib/currency-resource'
import type { CurrencyFormData } from '@/schemas/currency.schema'

export function CurrencyFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const currencyId = id ?? ''

  const { data: currency, isLoading } = useCurrency(isEdit ? currencyId : '')
  const createCurrency = useCreateCurrency()
  const updateCurrency = useUpdateCurrency()

  if (isEdit && isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner label="Chargement de la devise..." />
      </div>
    )
  }

  const defaultValues: Partial<CurrencyFormData> | undefined = currency
    ? currencyToFormDefaults(currency)
    : undefined

  const handleSubmit = async (data: CurrencyFormData) => {
    const payload = toCurrencyPayload(data)
    if (isEdit) {
      await updateCurrency.mutateAsync({ id: currencyId, payload })
      void navigate(`/admin/currencies/${currencyId}`)
    } else {
      const created = await createCurrency.mutateAsync(payload)
      void navigate(`/admin/currencies/${created.id}`)
    }
  }

  const isPending = createCurrency.isPending || updateCurrency.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to={isEdit ? `/admin/currencies/${currencyId}` : '/admin/currencies'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isEdit ? 'Détail devise' : 'Devises'}
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Banknote className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Modifier la devise' : 'Nouvelle devise'}
          </h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          {isEdit
            ? (currency ? `${currency.code} — ${currency.label}` : 'Mettre à jour les informations')
            : 'Définissez le code, le libellé et le symbole de la devise'}
        </p>
      </div>

      <CurrencyForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={isPending}
        submitLabel={isEdit ? 'Enregistrer les modifications' : 'Créer la devise'}
        cancelHref={isEdit ? `/admin/currencies/${currencyId}` : '/admin/currencies'}
      />
    </div>
  )
}
