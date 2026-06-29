import { useEffect } from 'react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Banknote, Plane, User } from 'lucide-react'
import { freightShipmentPatchSchema, type FreightShipmentPatchFormData } from '@/schemas/freight.schema'
import { CURRENCY, CURRENCY_OPTIONS } from '@/constants/ticket'
import { FREIGHT_PAYMENT_MODE, FREIGHT_PAYMENT_MODE_LABELS } from '@/constants/freight'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import {
  clampFreightPartialPaidAmount,
  computeFreightRemainingAmount,
  computeFreightTotalAmount,
} from '@/lib/freight'
import { formatMoney, cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'freight-shipment-patch-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFieldClass = cn(fieldClass, 'cursor-not-allowed bg-muted/60')

const paymentModeOptions = Object.entries(FREIGHT_PAYMENT_MODE_LABELS).map(([value, label]) => ({ value, label }))

interface FreightShipmentPatchFormProps {
  defaultValues?: Partial<FreightShipmentPatchFormData>
  onSubmit: (data: FreightShipmentPatchFormData) => void
  isLoading?: boolean
  cancelHref?: string
}

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof Plane
  children: ReactNode
}) {
  return (
    <Card className="rounded-2xl border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">{children}</CardContent>
    </Card>
  )
}

export function FreightShipmentPatchForm({
  defaultValues,
  onSubmit,
  isLoading,
  cancelHref,
}: FreightShipmentPatchFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<FreightShipmentPatchFormData>({
    resolver: zodResolver(freightShipmentPatchSchema),
    mode: 'onChange',
    defaultValues: {
      shipmentTime: '10:00',
      currency: CURRENCY.USD,
      ...defaultValues,
    },
  })

  const ordinaryFreight = useWatch({ control, name: 'ordinaryFreight' })
  const volumeFreight = useWatch({ control, name: 'volumeFreight' })
  const rva = useWatch({ control, name: 'rva' })
  const ltaFees = useWatch({ control, name: 'ltaFees' })
  const paidAmount = useWatch({ control, name: 'paidAmount' })
  const loadingPlace = watch('loadingPlace') ?? ''
  const unloadingPlace = watch('unloadingPlace') ?? ''
  const currency = watch('currency')
  const paymentMode = watch('paymentMode')
  const computedTotalAmount = computeFreightTotalAmount(ordinaryFreight, volumeFreight, rva, ltaFees)
  const computedRemainingAmount = computeFreightRemainingAmount(computedTotalAmount, paidAmount)

  const isCashPayment = paymentMode === FREIGHT_PAYMENT_MODE.CASH
  const isPartialPayment = paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL
  const canEditPaidAmount = isPartialPayment

  useEffect(() => {
    setValue('totalAmount', computedTotalAmount, { shouldValidate: true })
    if (isPartialPayment) {
      const paid = getValues('paidAmount')
      const clamped = clampFreightPartialPaidAmount(paid, computedTotalAmount)
      if (clamped !== paid) {
        setValue('paidAmount', clamped, { shouldValidate: true })
      } else {
        void trigger('paidAmount')
      }
    }
  }, [computedTotalAmount, isPartialPayment, getValues, setValue, trigger])

  useEffect(() => {
    if (isCashPayment) {
      setValue('paidAmount', computedTotalAmount, { shouldValidate: true })
    } else if (paymentMode === FREIGHT_PAYMENT_MODE.AT_ARRIVAL) {
      setValue('paidAmount', '0.00', { shouldValidate: true })
    }
  }, [isCashPayment, paymentMode, computedTotalAmount, setValue])

  useEffect(() => {
    setValue('remainingAmount', computedRemainingAmount, { shouldValidate: true })
  }, [computedRemainingAmount, setValue])

  const syncPricingTotals = () => {
    const total = computeFreightTotalAmount(
      getValues('ordinaryFreight'),
      getValues('volumeFreight'),
      getValues('rva'),
      getValues('ltaFees'),
    )
    setValue('totalAmount', total, { shouldValidate: true })
    const mode = getValues('paymentMode')
    let paid = getValues('paidAmount')
    if (mode === FREIGHT_PAYMENT_MODE.CASH) {
      paid = total
      setValue('paidAmount', paid, { shouldValidate: true })
    } else if (mode === FREIGHT_PAYMENT_MODE.PARTIAL) {
      const clamped = clampFreightPartialPaidAmount(paid, total)
      if (clamped !== paid) {
        paid = clamped
        setValue('paidAmount', paid, { shouldValidate: true })
      } else {
        void trigger('paidAmount')
      }
    }
    setValue('remainingAmount', computeFreightRemainingAmount(total, paid), { shouldValidate: true })
  }

  const syncRemainingAmount = () => {
    setValue(
      'remainingAmount',
      computeFreightRemainingAmount(getValues('totalAmount'), getValues('paidAmount')),
      { shouldValidate: true },
    )
    void trigger('paidAmount')
  }

  const handlePaymentModeChange = (mode: FreightShipmentPatchFormData['paymentMode']) => {
    setValue('paymentMode', mode, { shouldValidate: true })
    const total = computeFreightTotalAmount(
      getValues('ordinaryFreight'),
      getValues('volumeFreight'),
      getValues('rva'),
      getValues('ltaFees'),
    )
    const paid = mode === FREIGHT_PAYMENT_MODE.CASH ? total : '0.00'
    setValue('paidAmount', paid, { shouldValidate: true })
    setValue('remainingAmount', computeFreightRemainingAmount(total, paid), { shouldValidate: true })
  }

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4 pb-44 lg:pb-6">
      <FormSection title="Expédition" icon={Plane}>
        <Input label="Numéro LTA" className={fieldClass} error={errors.ltaNumber?.message} {...register('ltaNumber')} />
        <Input label="Date" type="date" className={fieldClass} error={errors.shipmentDate?.message} {...register('shipmentDate')} />
        <Input label="Heure" type="time" className={fieldClass} error={errors.shipmentTime?.message} {...register('shipmentTime')} />
        <Input label="Compagnie aérienne" className={fieldClass} error={errors.airline?.message} {...register('airline')} />
        <Input label="Avion" className={fieldClass} error={errors.aircraft?.message} {...register('aircraft')} />
        <Input label="Immatriculation" className={fieldClass} error={errors.registration?.message} {...register('registration')} />
        <div className="sm:col-span-2">
          <CheckpointAsyncSelect
            label="Lieu de chargement"
            placeholder="Rechercher le checkpoint..."
            variant="filter"
            initialCheckpointIri={defaultValues?.loadingPlace}
            value={loadingPlace}
            onChange={(iri) => setValue('loadingPlace', iri, { shouldValidate: true })}
            error={errors.loadingPlace?.message}
          />
        </div>
        <div className="sm:col-span-2">
          <CheckpointAsyncSelect
            label="Lieu de déchargement"
            placeholder="Rechercher le checkpoint..."
            variant="filter"
            initialCheckpointIri={defaultValues?.unloadingPlace}
            value={unloadingPlace}
            onChange={(iri) => setValue('unloadingPlace', iri, { shouldValidate: true })}
            error={errors.unloadingPlace?.message}
          />
        </div>
        <Input
          label="Nombre de colis"
          type="number"
          className={lockedFieldClass}
          error={errors.packageCount?.message}
          readOnly
          tabIndex={-1}
          {...register('packageCount', { valueAsNumber: true })}
        />
      </FormSection>

      <FormSection title="Expéditeur" icon={User}>
        <Input label="Nom" className={fieldClass} error={errors.senderName?.message} {...register('senderName')} />
        <Input label="Téléphone" className={fieldClass} error={errors.senderPhone?.message} {...register('senderPhone')} />
        <div className="sm:col-span-2">
          <Input label="Adresse" className={fieldClass} error={errors.senderAddress?.message} {...register('senderAddress')} />
        </div>
      </FormSection>

      <FormSection title="Destinataire" icon={User}>
        <Input label="Nom" className={fieldClass} error={errors.receiverName?.message} {...register('receiverName')} />
        <Input label="Téléphone" className={fieldClass} error={errors.receiverPhone?.message} {...register('receiverPhone')} />
        <div className="sm:col-span-2">
          <Input label="Adresse" className={fieldClass} error={errors.receiverAddress?.message} {...register('receiverAddress')} />
        </div>
      </FormSection>

      <FormSection title="Tarification" icon={Banknote}>
        <Select
          label="Devise"
          options={CURRENCY_OPTIONS}
          variant="filter"
          value={currency ?? CURRENCY.USD}
          onChange={(e) =>
            setValue('currency', e.target.value as FreightShipmentPatchFormData['currency'], { shouldValidate: true })
          }
          error={errors.currency?.message}
        />
        <Input
          label="Poids total (kg)"
          inputMode="decimal"
          className={lockedFieldClass}
          error={errors.totalWeight?.message}
          readOnly
          tabIndex={-1}
          {...register('totalWeight')}
        />
        {(['ordinaryFreight', 'volumeFreight', 'rva', 'ltaFees'] as const).map((name) => {
          const field = register(name)
          const labels = {
            ordinaryFreight: 'Fret ordinaire',
            volumeFreight: 'Fret volume',
            rva: 'RVA',
            ltaFees: 'Frais LTA',
          } as const
          return (
            <Input
              key={name}
              label={labels[name]}
              inputMode="decimal"
              className={fieldClass}
              error={errors[name]?.message}
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              onChange={(e) => {
                void field.onChange(e)
                syncPricingTotals()
              }}
            />
          )
        })}
        <Input
          label="Montant total"
          inputMode="decimal"
          className={lockedFieldClass}
          error={errors.totalAmount?.message}
          readOnly
          tabIndex={-1}
          {...register('totalAmount')}
        />
        <Select
          label="Mode de paiement"
          options={paymentModeOptions}
          variant="filter"
          value={paymentMode ?? FREIGHT_PAYMENT_MODE.AT_ARRIVAL}
          onChange={(e) =>
            handlePaymentModeChange(e.target.value as FreightShipmentPatchFormData['paymentMode'])
          }
          error={errors.paymentMode?.message}
        />
        {canEditPaidAmount ? (
          <Input
            label="Montant payé"
            inputMode="decimal"
            className={fieldClass}
            error={errors.paidAmount?.message}
            {...register('paidAmount', {
              onChange: () => syncRemainingAmount(),
              onBlur: () => {
                const total = getValues('totalAmount')
                const clamped = clampFreightPartialPaidAmount(getValues('paidAmount'), total)
                if (clamped !== getValues('paidAmount')) {
                  setValue('paidAmount', clamped, { shouldValidate: true })
                  syncRemainingAmount()
                }
              },
            })}
          />
        ) : (
          <Input
            label="Montant payé"
            inputMode="decimal"
            className={lockedFieldClass}
            error={errors.paidAmount?.message}
            readOnly
            tabIndex={-1}
            {...register('paidAmount')}
          />
        )}
        <Input
          label="Reste à payer"
          inputMode="decimal"
          className={lockedFieldClass}
          error={errors.remainingAmount?.message}
          readOnly
          tabIndex={-1}
          {...register('remainingAmount')}
        />
        <div className="flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3 sm:col-span-2">
          <span className="text-sm font-semibold">Total estimé</span>
          <span className="text-lg font-bold tabular-nums text-brand-orange">
            {formatMoney(parseFloat(computedTotalAmount) || 0, currency ?? CURRENCY.USD)}
          </span>
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Observations"
            placeholder="Remarques éventuelles..."
            className={fieldClass}
            error={errors.observations?.message}
            {...register('observations')}
          />
        </div>
      </FormSection>

      <input type="hidden" {...register('loadingPlace')} />
      <input type="hidden" {...register('unloadingPlace')} />

      <div className="hidden flex-col items-end gap-3 pt-2 lg:flex">
        <div className="flex gap-3">
          {cancelHref && (
            <Button type="button" variant="outline" asChild className="h-11 rounded-xl">
              <Link to={cancelHref}>Annuler</Link>
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="h-11 rounded-xl px-8">
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            form={FORM_ID}
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
          {cancelHref && (
            <Button type="button" variant="outline" asChild className="h-11 w-full rounded-xl">
              <Link to={cancelHref}>Annuler</Link>
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
