import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import {
  MANUAL_DEBT_CURRENCY,
  MANUAL_DEBT_CURRENCY_OPTIONS,
} from '@/constants/manual-debt'
import {
  manualDebtCreateSchema,
  type ManualDebtCreateFormData,
} from '@/schemas/manual-debt.schema'
import type { ManualDebtCreatePayload } from '@/types/manual-debt'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface ManualDebtCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: ManualDebtCreatePayload) => Promise<void>
  isLoading?: boolean
}

export function ManualDebtCreateModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ManualDebtCreateModalProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ManualDebtCreateFormData>({
    resolver: zodResolver(manualDebtCreateSchema),
    defaultValues: {
      debtorName: '',
      debtorPhone: '',
      amount: '',
      currency: MANUAL_DEBT_CURRENCY.USD,
      reason: '',
      notes: '',
    },
  })

  const currency = watch('currency')

  useEffect(() => {
    if (!open) return
    reset({
      debtorName: '',
      debtorPhone: '',
      amount: '',
      currency: MANUAL_DEBT_CURRENCY.USD,
      reason: '',
      notes: '',
    })
  }, [open, reset])

  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) onOpenChange(false)
  }

  const submit = handleSubmit(async (data) => {
    await onConfirm({
      debtorName: data.debtorName.trim(),
      debtorPhone: data.debtorPhone?.trim() || null,
      amount: data.amount.trim().replace(',', '.'),
      currency: data.currency,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || null,
    })
  })

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="Nouvelle dette"
      description="Enregistrer une dette manuelle hors billet / fret / bagages."
      className="rounded-2xl sm:max-w-lg"
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <Input
          label="Débiteur"
          className={fieldClass}
          error={errors.debtorName?.message}
          disabled={isLoading}
          {...register('debtorName')}
        />
        <Input
          label="Téléphone (optionnel)"
          className={fieldClass}
          error={errors.debtorPhone?.message}
          disabled={isLoading}
          {...register('debtorPhone')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Montant"
            inputMode="decimal"
            className={fieldClass}
            error={errors.amount?.message}
            disabled={isLoading}
            {...register('amount')}
          />
          <Select
            label="Devise"
            options={MANUAL_DEBT_CURRENCY_OPTIONS}
            error={errors.currency?.message}
            disabled={isLoading}
            variant="filter"
            value={currency}
            onChange={(e) =>
              setValue('currency', e.target.value as ManualDebtCreateFormData['currency'], {
                shouldValidate: true,
              })
            }
          />
        </div>
        <Textarea
          label="Motif"
          rows={3}
          className="rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input"
          error={errors.reason?.message}
          disabled={isLoading}
          {...register('reason')}
        />
        <Textarea
          label="Notes (optionnel)"
          rows={2}
          className="rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input"
          error={errors.notes?.message}
          disabled={isLoading}
          {...register('notes')}
        />
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 rounded-xl"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" className="h-11 flex-1 rounded-xl" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
