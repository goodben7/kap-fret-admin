import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, ClipboardCheck } from 'lucide-react'
import { useCheckIn, useUpdateCheckIn } from '@/hooks/useCheckIns'
import { useCreateCashTransaction } from '@/hooks/useCashTransactions'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { CheckInForm } from '@/components/forms/CheckInForm'
import { CheckInBaggageTransactionModal } from '@/components/checkins/CheckInBaggageTransactionModal'
import {
  checkInToFormDefaults,
  computeCheckInAddedBaggagePaymentDelta,
  getCheckInIssuingOfficeLabel,
  getCheckInTicketLabel,
  toCheckInPatchPayload,
  toCheckInPatchPayloadWithBaggagePayment,
  type CheckInAddedBaggagePaymentDelta,
} from '@/lib/check-in'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import type { CheckInPatchFormData } from '@/schemas/checkin.schema'

export function CheckInEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const checkInId = id ?? ''
  const { data: checkIn, isLoading } = useCheckIn(checkInId)
  const updateCheckIn = useUpdateCheckIn()
  const createTransaction = useCreateCashTransaction()
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []

  const [transactionModalOpen, setTransactionModalOpen] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<CheckInPatchFormData | null>(null)
  const [paymentDelta, setPaymentDelta] = useState<CheckInAddedBaggagePaymentDelta | null>(null)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner label="Chargement du check-in..." />
      </div>
    )
  }

  if (!checkIn) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Check-in introuvable"
        action={{ label: 'Retour aux check-ins', onClick: () => { window.location.href = '/checkins' } }}
      />
    )
  }

  const saveCheckIn = async (data: CheckInPatchFormData) => {
    await updateCheckIn.mutateAsync({ id: checkInId, payload: toCheckInPatchPayload(data) })
    void navigate(`/checkins/${checkInId}`)
  }

  const handleSubmit = async (data: CheckInPatchFormData) => {
    const delta = computeCheckInAddedBaggagePaymentDelta(checkIn, data, exchangeRates)
    if (delta) {
      setPendingFormData(data)
      setPaymentDelta(delta)
      setTransactionModalOpen(true)
      return
    }
    await saveCheckIn(data)
  }

  const handleTransactionConfirm = async ({
    transaction,
    paidAmount,
  }: {
    transaction: Parameters<typeof createTransaction.mutateAsync>[0]
    paidAmount: string
  }) => {
    if (!pendingFormData) return
    await createTransaction.mutateAsync(transaction)
    await updateCheckIn.mutateAsync({
      id: checkInId,
      payload: toCheckInPatchPayloadWithBaggagePayment(checkIn, pendingFormData, paidAmount),
    })
    setTransactionModalOpen(false)
    setPendingFormData(null)
    setPaymentDelta(null)
    void navigate(`/checkins/${checkInId}`)
  }

  const isSaving = updateCheckIn.isPending || createTransaction.isPending

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
        <Link
          to={`/checkins/${checkIn.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour au check-in
        </Link>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Pencil className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Modifier le check-in</h1>
          </div>
          <p className="pl-11 font-mono text-sm text-muted-foreground">{checkIn.id}</p>
        </div>

        <CheckInForm
          key={checkInId}
          isEdit
          ticketLabel={getCheckInTicketLabel(checkIn)}
          issuingOfficeLabel={getCheckInIssuingOfficeLabel(checkIn)}
          defaultValues={checkInToFormDefaults(checkIn)}
          onSubmit={handleSubmit}
          isLoading={isSaving && !transactionModalOpen}
          submitLabel="Enregistrer les modifications"
          cancelHref={`/checkins/${checkIn.id}`}
        />
      </div>

      {paymentDelta && (
        <CheckInBaggageTransactionModal
          open={transactionModalOpen}
          onOpenChange={(open) => {
            if (!open && !isSaving) {
              setTransactionModalOpen(false)
              setPendingFormData(null)
              setPaymentDelta(null)
            }
          }}
          checkIn={checkIn}
          delta={paymentDelta}
          onConfirm={handleTransactionConfirm}
          isLoading={isSaving}
        />
      )}
    </>
  )
}
