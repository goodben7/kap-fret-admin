import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { useCreateExchangeRate } from '@/hooks/useExchangeRates'
import { ExchangeRateForm } from '@/components/forms/ExchangeRateForm'
import { toExchangeRateCreatePayload } from '@/lib/exchange-rate'
import type { ExchangeRateFormData } from '@/schemas/exchange-rate.schema'

export function ExchangeRateFormPage() {
  const navigate = useNavigate()
  const createExchangeRate = useCreateExchangeRate()

  const handleSubmit = async (data: ExchangeRateFormData) => {
    const created = await createExchangeRate.mutateAsync(toExchangeRateCreatePayload(data))
    void navigate(`/admin/exchange-rates/${created.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/admin/exchange-rates"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Taux de change
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <ArrowLeftRight className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau taux de change</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Définissez la conversion entre deux devises du bureau
        </p>
      </div>

      <ExchangeRateForm
        onSubmit={handleSubmit}
        isLoading={createExchangeRate.isPending}
        submitLabel="Créer le taux"
        cancelHref="/admin/exchange-rates"
      />
    </div>
  )
}
