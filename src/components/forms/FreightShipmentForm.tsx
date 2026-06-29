import { useEffect, useMemo } from 'react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Box,
    Package,
  Plane,
  Plus,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { freightShipmentSchema, type FreightShipmentFormData } from '@/schemas/freight.schema'
import { CURRENCY, CURRENCY_OPTIONS } from '@/constants/ticket'
import {
  FREIGHT_PAYMENT_MODE,
  FREIGHT_PAYMENT_MODE_LABELS,
  FREIGHT_ORDINARY_PRICE_PER_KG_USD,
  NATURE_OF_GOODS,
  NATURE_OF_GOODS_LABELS,
  PACKAGING_TYPE,
  PACKAGING_TYPE_LABELS,
} from '@/constants/freight'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCurrentTravelTimeInput, getTodayTravelDateInput } from '@/lib/ticket'
import {
  computeFreightOrdinaryAmount,
  computeFreightPackagesTotalWeight,
  computeFreightRemainingAmount,
  computeFreightTotalAmount,
  clampFreightPartialPaidAmount,
} from '@/lib/freight'
import { formatMoney, cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const FORM_ID = 'freight-shipment-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFieldClass = cn(fieldClass, 'cursor-not-allowed bg-muted/60')

const packagingOptions = Object.entries(PACKAGING_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const natureOptions = Object.entries(NATURE_OF_GOODS_LABELS).map(([value, label]) => ({ value, label }))
const paymentModeOptions = Object.entries(FREIGHT_PAYMENT_MODE_LABELS).map(([value, label]) => ({ value, label }))

interface FreightShipmentFormProps {
  defaultValues?: Partial<FreightShipmentFormData>
  onSubmit: (data: FreightShipmentFormData) => void
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
}

const defaultPackage = {
  packageNumber: '',
  packagingType: PACKAGING_TYPE.CARTON,
  natureOfGoods: NATURE_OF_GOODS.GENERAL_CARGO,
  unitWeight: '',
  totalWeight: '',
} as const

function FormSection({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string
  icon: typeof Package
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <Card className={cn('rounded-2xl border-border/80 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">{children}</CardContent>
    </Card>
  )
}

function FreightFormActions({
  formId,
  isLoading,
  submitLabel,
  cancelHref,
}: {
  formId: string
  isLoading?: boolean
  submitLabel: string
  cancelHref?: string
}) {
  return (
    <>
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
              submitLabel
            )}
          </Button>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
        <div className="mx-auto max-w-3xl space-y-2 p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            form={formId}
            disabled={isLoading}
            className="h-11 w-full rounded-xl bg-brand-orange font-semibold hover:bg-brand-orange/90"
          >
            {isLoading ? (
              <>
                <LoaderIcon />
                Enregistrement...
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {cancelHref && (
            <Button type="button" variant="outline" asChild className="h-11 w-full rounded-xl">
              <Link to={cancelHref}>Annuler</Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )
}

export function FreightShipmentForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Créer l'expédition",
  cancelHref,
}: FreightShipmentFormProps) {
  const { user } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(issuingOfficeIri)
  const { data: currencies = [] } = useCurrenciesForSelect()
  const { data: exchangeRatesData } = useExchangeRates({ pagination: false })
  const exchangeRates = exchangeRatesData?.items ?? []

  const currencyCodeByIri = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of currencies) {
      const iri = extractIri(c) ?? c['@id']
      if (iri && c.code) map.set(iri, c.code)
    }
    return map
  }, [currencies])

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    trigger,
    formState: { errors },
  } = useForm<FreightShipmentFormData>({
    resolver: zodResolver(freightShipmentSchema),
    mode: 'onChange',
    defaultValues: {
      shipmentDate: getTodayTravelDateInput(),
      shipmentTime: getCurrentTravelTimeInput(),
      paymentMode: FREIGHT_PAYMENT_MODE.AT_ARRIVAL,
      currency: CURRENCY.USD,
      volumeFreight: '0.00',
      rva: '0.00',
      ltaFees: '0.00',
      ordinaryFreight: '0.00',
      paidAmount: '0.00',
      remainingAmount: '0.00',
      packageCount: 1,
      cashRegister: '',
      packages: [{ ...defaultPackage }],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'packages' })
  const watchedPackages = useWatch({ control, name: 'packages' })
  const ordinaryFreight = useWatch({ control, name: 'ordinaryFreight' })
  const volumeFreight = useWatch({ control, name: 'volumeFreight' })
  const rva = useWatch({ control, name: 'rva' })
  const ltaFees = useWatch({ control, name: 'ltaFees' })
  const watchedPaidAmount = useWatch({ control, name: 'paidAmount' })
  const ltaNumber = watch('ltaNumber')
  const loadingPlace = watch('loadingPlace') ?? ''
  const unloadingPlace = watch('unloadingPlace') ?? ''
  const currency = watch('currency')
  const paymentMode = watch('paymentMode')
  const cashRegister = watch('cashRegister')

  const cashRegisterOptions = useMemo(
    () =>
      cashRegisters.map((register) => {
        const code = getCashRegisterCurrencyCode(register.currency, currencyCodeByIri)
        const value = extractIri(register) ?? register['@id']
        return {
          value,
          label: code ? `${register.code} — ${register.name} (${code})` : `${register.code} — ${register.name}`,
        }
      }),
    [cashRegisters, currencyCodeByIri],
  )

  const packagesTotalWeight = computeFreightPackagesTotalWeight(watchedPackages)
  const computedTotalAmount = computeFreightTotalAmount(ordinaryFreight, volumeFreight, rva, ltaFees)
  const computedRemainingAmount = computeFreightRemainingAmount(computedTotalAmount, watchedPaidAmount)

  const isCashPayment = paymentMode === FREIGHT_PAYMENT_MODE.CASH
  const isPartialPayment = paymentMode === FREIGHT_PAYMENT_MODE.PARTIAL
  const needsCashRegister = isCashPayment || isPartialPayment
  const canEditPaidAmount = isPartialPayment

  const freightCurrencyIri = resolveCurrencyIriByCode(currencies, currency ?? CURRENCY.USD)
  const conversionPreviewAmount = isPartialPayment
    ? String(watchedPaidAmount ?? '').trim()
    : computedTotalAmount
  const hasConversionAmount = (parseFloat(conversionPreviewAmount) || 0) > 0
  const showConversionPreview =
    (isCashPayment || isPartialPayment)
    && !!cashRegister?.trim()
    && !!freightCurrencyIri
    && hasConversionAmount
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount: conversionPreviewAmount || '0',
    currencyIri: freightCurrencyIri,
    enabled: showConversionPreview,
  })

  useEffect(() => {
    if (!needsCashRegister) {
      setValue('cashRegister', '', { shouldValidate: true })
    }
  }, [needsCashRegister, setValue])

  useEffect(() => {
    setValue('packageCount', fields.length, { shouldValidate: true })
  }, [fields.length, setValue])

  useEffect(() => {
    const lta = ltaNumber?.trim() ?? ''
    for (let index = 0; index < fields.length; index++) {
      setValue(`packages.${index}.packageNumber`, lta, { shouldValidate: true })
    }
  }, [ltaNumber, fields.length, setValue])

  useEffect(() => {
    setValue('totalWeight', packagesTotalWeight, { shouldValidate: true })
    setValue(
      'ordinaryFreight',
      computeFreightOrdinaryAmount(packagesTotalWeight, currency ?? CURRENCY.USD, exchangeRates),
      { shouldValidate: true },
    )
  }, [packagesTotalWeight, currency, exchangeRates, setValue])

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

  const syncPackagesTotalWeight = () => {
    const total = computeFreightPackagesTotalWeight(getValues('packages'))
    const formCurrency = getValues('currency') ?? CURRENCY.USD
    setValue('totalWeight', total, { shouldValidate: true })
    setValue(
      'ordinaryFreight',
      computeFreightOrdinaryAmount(total, formCurrency, exchangeRates),
      { shouldValidate: true },
    )
  }

  const handleCurrencyChange = (nextCurrency: FreightShipmentFormData['currency']) => {
    setValue('currency', nextCurrency, { shouldValidate: true })
    const weight = getValues('totalWeight') || packagesTotalWeight
    setValue(
      'ordinaryFreight',
      computeFreightOrdinaryAmount(weight, nextCurrency, exchangeRates),
      { shouldValidate: true },
    )
  }

  const handleUnitWeightChange = (index: number, value: string) => {
    setValue(`packages.${index}.totalWeight`, value, { shouldValidate: true })
    syncPackagesTotalWeight()
  }

  const appendPackage = () => {
    append({
      ...defaultPackage,
      packageNumber: getValues('ltaNumber')?.trim() ?? '',
    })
  }

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

  const handlePaymentModeChange = (mode: FreightShipmentFormData['paymentMode']) => {
    setValue('paymentMode', mode, { shouldValidate: true })
    if (mode !== FREIGHT_PAYMENT_MODE.CASH && mode !== FREIGHT_PAYMENT_MODE.PARTIAL) {
      setValue('cashRegister', '', { shouldValidate: true })
    }
    const total = computeFreightTotalAmount(
      getValues('ordinaryFreight'),
      getValues('volumeFreight'),
      getValues('rva'),
      getValues('ltaFees'),
    )
    const currentPaid = getValues('paidAmount')
    const currentPaidNum = parseFloat(currentPaid) || 0
    const paid =
      mode === FREIGHT_PAYMENT_MODE.CASH
        ? total
        : mode === FREIGHT_PAYMENT_MODE.PARTIAL
          ? currentPaidNum > 0
            ? currentPaid
            : ''
          : '0.00'
    setValue('paidAmount', paid, { shouldValidate: true })
    setValue('remainingAmount', computeFreightRemainingAmount(total, paid), { shouldValidate: true })
  }

  const paidAmountField = register('paidAmount')

  return (
    <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          inputMode="numeric"
          min={1}
          className={cn(fieldClass, 'cursor-not-allowed bg-muted/60')}
          error={errors.packageCount?.message}
          readOnly
          tabIndex={-1}
          {...register('packageCount', { valueAsNumber: true })}
        />
      </FormSection>

      <FormSection title="Expéditeur" icon={Send}>
        <Input label="Nom" className={fieldClass} error={errors.senderName?.message} {...register('senderName')} />
        <Input label="Téléphone" inputMode="tel" className={fieldClass} error={errors.senderPhone?.message} {...register('senderPhone')} />
        <div className="sm:col-span-2">
          <Input label="Adresse" className={fieldClass} error={errors.senderAddress?.message} {...register('senderAddress')} />
        </div>
      </FormSection>

      <FormSection title="Destinataire" icon={User}>
        <Input label="Nom" className={fieldClass} error={errors.receiverName?.message} {...register('receiverName')} />
        <Input label="Téléphone" inputMode="tel" className={fieldClass} error={errors.receiverPhone?.message} {...register('receiverPhone')} />
        <div className="sm:col-span-2">
          <Input label="Adresse" className={fieldClass} error={errors.receiverAddress?.message} {...register('receiverAddress')} />
        </div>
      </FormSection>

      <FormSection
        title="Colis"
        icon={Box}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={appendPackage}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
        }
      >
        {fields.map((field, index) => (
          <Card key={field.id} className="rounded-xl border-border/80 shadow-sm sm:col-span-2">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Colis {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label="Supprimer colis"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="N° colis"
                  className={fieldClass}
                  error={errors.packages?.[index]?.packageNumber?.message}
                  {...register(`packages.${index}.packageNumber`)}
                />
                <Select
                  label="Emballage"
                  options={packagingOptions}
                  variant="filter"
                  value={watch(`packages.${index}.packagingType`)}
                  onChange={(e) =>
                    setValue(`packages.${index}.packagingType`, e.target.value as FreightShipmentFormData['packages'][number]['packagingType'], {
                      shouldValidate: true,
                    })
                  }
                  error={errors.packages?.[index]?.packagingType?.message}
                />
                <Select
                  label="Nature"
                  options={natureOptions}
                  variant="filter"
                  value={watch(`packages.${index}.natureOfGoods`)}
                  onChange={(e) =>
                    setValue(`packages.${index}.natureOfGoods`, e.target.value as FreightShipmentFormData['packages'][number]['natureOfGoods'], {
                      shouldValidate: true,
                    })
                  }
                  error={errors.packages?.[index]?.natureOfGoods?.message}
                />
                {(() => {
                  const unitWeightField = register(`packages.${index}.unitWeight`)
                  return (
                    <Input
                      label="Poids unitaire (kg)"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className={fieldClass}
                      error={errors.packages?.[index]?.unitWeight?.message}
                      name={unitWeightField.name}
                      ref={unitWeightField.ref}
                      onBlur={unitWeightField.onBlur}
                      onChange={(e) => {
                        void unitWeightField.onChange(e)
                        handleUnitWeightChange(index, e.target.value)
                      }}
                    />
                  )
                })()}
                {(() => {
                  const totalWeightField = register(`packages.${index}.totalWeight`)
                  return (
                    <Input
                      label="Poids total (kg)"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className={fieldClass}
                      error={errors.packages?.[index]?.totalWeight?.message}
                      name={totalWeightField.name}
                      ref={totalWeightField.ref}
                      onBlur={totalWeightField.onBlur}
                      onChange={(e) => {
                        void totalWeightField.onChange(e)
                        syncPackagesTotalWeight()
                      }}
                    />
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        ))}
      </FormSection>

      <FormSection title="Tarification" icon={Banknote}>
        <Select
          label="Devise"
          options={CURRENCY_OPTIONS}
          variant="filter"
          value={currency ?? CURRENCY.USD}
          onChange={(e) =>
            handleCurrencyChange(e.target.value as FreightShipmentFormData['currency'])
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
            <div key={name} className={name === 'ordinaryFreight' ? 'sm:col-span-2' : undefined}>
              <Input
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
              {name === 'ordinaryFreight' && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Calcul auto : {FREIGHT_ORDINARY_PRICE_PER_KG_USD} $ / kg
                  {currency === CURRENCY.CDF ? ' (converti en CDF via le taux de change actif)' : ''}
                  {' — modifiable'}
                </p>
              )}
            </div>
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
            handlePaymentModeChange(e.target.value as FreightShipmentFormData['paymentMode'])
          }
          error={errors.paymentMode?.message}
        />
        {needsCashRegister && (
          <Select
            label="Caisse"
            placeholder={
              cashRegistersLoading
                ? 'Chargement des caisses...'
                : cashRegisterOptions.length
                  ? 'Sélectionner une caisse'
                  : 'Aucune caisse disponible'
            }
            options={cashRegisterOptions}
            error={errors.cashRegister?.message}
            disabled={cashRegistersLoading || cashRegisterOptions.length === 0}
            variant="filter"
            value={cashRegister ?? ''}
            onChange={(e) => setValue('cashRegister', e.target.value, { shouldValidate: true })}
          />
        )}
        {canEditPaidAmount ? (
          <Input
            label="Montant payé"
            inputMode="decimal"
            className={fieldClass}
            error={errors.paidAmount?.message}
            name={paidAmountField.name}
            ref={paidAmountField.ref}
            onChange={(e) => {
              void paidAmountField.onChange(e)
              syncRemainingAmount()
            }}
            onBlur={(e) => {
              void paidAmountField.onBlur(e)
              const total = getValues('totalAmount')
              const clamped = clampFreightPartialPaidAmount(getValues('paidAmount'), total)
              if (clamped !== getValues('paidAmount')) {
                setValue('paidAmount', clamped, { shouldValidate: true })
                syncRemainingAmount()
              }
            }}
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
        {showConversionPreview && (
          <ConversionPreviewCard
            preview={conversionPreview}
            isLoading={conversionPreviewLoading}
            isError={conversionPreviewError}
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
          <Input label="Observations" placeholder="Remarques éventuelles..." className={fieldClass} error={errors.observations?.message} {...register('observations')} />
        </div>
      </FormSection>

      <input type="hidden" {...register('loadingPlace')} />
      <input type="hidden" {...register('unloadingPlace')} />

      <FreightFormActions
        formId={FORM_ID}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}
