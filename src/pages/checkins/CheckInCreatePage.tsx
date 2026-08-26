import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { useCreateCheckIn, useCreateCheckInBatch } from '@/hooks/useCheckIns'
import { CheckInForm } from '@/components/forms/CheckInForm'
import { toCheckInBatchPayload, toCheckInCreatePayload } from '@/lib/check-in'
import { clearFormDraft } from '@/lib/form-draft'
import { STORAGE_KEYS } from '@/constants/storage'
import type { CheckInCreateFormData } from '@/schemas/checkin.schema'

export function CheckInCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTicketId = searchParams.get('ticket') ?? undefined
  const createCheckIn = useCreateCheckIn()
  const createCheckInBatch = useCreateCheckInBatch()

  const handleSubmit = async (
    data: CheckInCreateFormData,
    options: { ticketIris: string[] },
  ) => {
    if (options.ticketIris.length > 1) {
      await createCheckInBatch.mutateAsync(toCheckInBatchPayload(data, options.ticketIris))
    } else {
      await createCheckIn.mutateAsync(
        toCheckInCreatePayload({
          ...data,
          ticketIri: options.ticketIris[0] ?? data.ticketIri,
        }),
      )
    }
    clearFormDraft(STORAGE_KEYS.DRAFT_CHECKIN_CREATE)
    void navigate('/checkins')
  }

  const isLoading = createCheckIn.isPending || createCheckInBatch.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/checkins"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Check-In
      </Link>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau check-in</h1>
        </div>
        <p className="pl-11 text-sm text-muted-foreground">
          Recherchez un billet — pour un achat groupé, sélectionnez les passagers à enregistrer ensemble
        </p>
      </div>

      <CheckInForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        submitLabel="Enregistrer le check-in"
        cancelHref="/checkins"
        initialTicketId={initialTicketId}
      />
    </div>
  )
}
