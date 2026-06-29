import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Building2,
  Luggage,
  MapPin,
  Plus,
  Scale,
  Ticket as TicketIcon,
  Trash2,
  User,
} from 'lucide-react'
import {
  checkInCreateSchema,
  checkInPatchSchema,
  type CheckInCreateFormData,
  type CheckInPatchFormData,
} from '@/schemas/checkin.schema'
import { CHECK_IN_EXCESS_PRICE_PER_KG_USD } from '@/constants/check-in'
import {
  BAGGAGE_TYPE,
  BAGGAGE_TYPE_OPTIONS,
  CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG,
  getAvailableBaggageTypeOptions,
  getHandHoldHandRemainderKg,
  getWeightForBaggageType,
  type BaggageType,
} from '@/constants/check-in-baggage'
import { CURRENCY, CURRENCY_OPTIONS, normalizeCurrency } from '@/constants/ticket'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { toIri, extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { getCheckpointDisplayName } from '@/lib/checkpoint'
import {
  computeCheckInExcessPrice,
  computeExcessWeightFromBaggages,
  computeWeightsFromBaggages,
  formatCheckInWeight,
  toEncodedAtDateInput,
} from '@/lib/check-in'
import { ticketService } from '@/services/ticket.service'
import type { Ticket } from '@/types/ticket'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HydraAutocomplete } from '@/components/ui/hydra-autocomplete'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import { formatDate, formatMoney, cn } from '@/lib/utils'

const FORM_ID = 'checkin-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

const lockedFieldClass = cn(fieldClass, 'cursor-not-allowed bg-muted/60')

const defaultBaggage = {
  weight: '',
  baggageType: BAGGAGE_TYPE.REGULAR,
  description: '',
} as const

const defaultSouteBaggage = {
  weight: String(CHECK_IN_REGULAR_BAGGAGE_ALLOWANCE_KG),
  baggageType: BAGGAGE_TYPE.REGULAR,
  description: '',
} as const

function resolveInitialBaggages(
  defaultValues?: Partial<CheckInCreateFormData>,
  isEdit = false,
) {
  if (defaultValues?.baggages && defaultValues.baggages.length > 0) {
    return defaultValues.baggages
  }
  if (isEdit) {
    return [{ ...defaultBaggage }]
  }
  return [{ ...defaultSouteBaggage }]
}

interface CheckInFormBaseProps {
  defaultValues?: Partial<CheckInCreateFormData>
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
  ticketLabel?: string
  issuingOfficeLabel?: string
}

interface CheckInCreateFormProps extends CheckInFormBaseProps {
  isEdit?: false
  onSubmit: (data: CheckInCreateFormData) => void
}

interface CheckInEditFormProps extends CheckInFormBaseProps {
  isEdit: true
  onSubmit: (data: CheckInPatchFormData) => void
}

export type CheckInFormProps = CheckInCreateFormProps | CheckInEditFormProps

function FormSection({
  title,
  icon: Icon,
  children,
  className,
  action,
}: {
  title: string
  icon: typeof TicketIcon
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <Card className={cn('rounded-2xl border-border/80 shadow-sm', className)}>
      <CardHeader className={cn('pb-3', action && 'flex flex-row items-center justify-between gap-3')}>
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

function CheckInFormActions({
  formId,
  canSubmit,
  isLoading,
  submitLabel,
  cancelHref,
}: {
  formId: string
  canSubmit: boolean
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
          <Button type="submit" disabled={!canSubmit || isLoading} className="h-11 rounded-xl px-8">
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
            disabled={!canSubmit || isLoading}
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

function SelectedTicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <div className="rounded-xl border border-brand-orange/25 bg-brand-orange/5 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">
          <User className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{ticket.passengerName}</p>
          <p className="font-mono text-xs text-muted-foreground truncate">{ticket.ticketNumber}</p>
        </div>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p className="inline-flex items-center gap-1.5 text-muted-foreground min-w-0">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
          <span className="truncate">
            {getCheckpointDisplayName(ticket.departure)} → {getCheckpointDisplayName(ticket.destination)}
          </span>
        </p>
        <p className="text-muted-foreground">
          {formatDate(ticket.travelDate)} · {ticket.travelTime}
        </p>
        <p className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Scale className="h-3.5 w-3.5 shrink-0 text-brand-orange" aria-hidden="true" />
          Kilo total accordé : {formatCheckInWeight(ticket.baggageAllowanceKg)}
        </p>
        {ticket.issuingOfficeName && (
          <p className="text-muted-foreground truncate">Bureau : {ticket.issuingOfficeName}</p>
        )}
      </div>
    </div>
  )
}

export function CheckInForm(props: CheckInFormProps) {
  const {
    defaultValues,
    onSubmit,
    isLoading,
    submitLabel = 'Enregistrer le check-in',
    cancelHref,
    isEdit = false,
    ticketLabel,
    issuingOfficeLabel,
  } = props

  const { user, issuingOfficeName } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(
    isEdit ? undefined : issuingOfficeIri,
  )
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

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [isLoadingTicket, setIsLoadingTicket] = useState(false)
  const initialBaggages = resolveInitialBaggages(defaultValues, isEdit)

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    formState: { errors, isValid },
  } = useForm<CheckInPatchFormData>({
    resolver: (isEdit
      ? zodResolver(checkInPatchSchema)
      : zodResolver(checkInCreateSchema)) as Resolver<CheckInPatchFormData>,
    mode: 'onChange',
    defaultValues: {
      ticketIri: '',
      cashRegister: '',
      checkInWeight: '0.00',
      baggageAllowanceKg: '',
      excessWeightKg: '0.00',
      excessPrice: '0',
      currency: CURRENCY.USD,
      netToPay: '0',
      handBaggageWeight: '0.00',
      observations: '',
      encodedAt: toEncodedAtDateInput(),
      ...defaultValues,
      baggages: initialBaggages,
    },
  })

  const { fields, prepend, remove } = useFieldArray({ control, name: 'baggages' })

  /** Lignes chargées depuis l'API au montage — les nouvelles lignes (prepend) ont un field.id différent */
  const initialBaggageFieldIdsRef = useRef<Set<string> | null>(null)
  const initialServerBaggageIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isEdit || initialBaggageFieldIdsRef.current !== null) return
    if (fields.length === 0) return

    initialBaggageFieldIdsRef.current = new Set(fields.map((field) => field.id))
    initialServerBaggageIdsRef.current = new Set(
      (defaultValues?.baggages ?? [])
        .map((baggage) => baggage.id?.trim())
        .filter((id): id is string => !!id && id !== 'undefined'),
    )
  }, [defaultValues?.baggages, fields, isEdit])

  const isPersistedBaggageRow = useCallback(
    (fieldKey: string, baggageId: string | undefined) => {
      if (!isEdit || !initialBaggageFieldIdsRef.current?.has(fieldKey)) return false
      const serverId = String(baggageId ?? '').trim()
      return serverId !== '' && serverId !== 'undefined' && initialServerBaggageIdsRef.current.has(serverId)
    },
    [isEdit],
  )

  const syncDerivedWeights = useCallback(
    (options?: { updateExcessPrice?: boolean }) => {
      const baggages = getValues('baggages') ?? []
      const { checkInWeight: computedCheckIn, handBaggageWeight: computedHand } =
        computeWeightsFromBaggages(baggages)
      const excess = computeExcessWeightFromBaggages(baggages)
      const formCurrency = normalizeCurrency(getValues('currency'))
      setValue('checkInWeight', computedCheckIn, { shouldValidate: true })
      setValue('handBaggageWeight', computedHand, { shouldValidate: true })
      setValue('excessWeightKg', excess, { shouldValidate: true })
      if (options?.updateExcessPrice) {
        const price = computeCheckInExcessPrice(excess, formCurrency, exchangeRates)
        setValue('excessPrice', price, { shouldValidate: true })
        setValue('netToPay', price, { shouldValidate: true })
      }
    },
    [exchangeRates, getValues, setValue],
  )

  const excessWeightKg = watch('excessWeightKg')
  const currency = watch('currency')
  const excessPrice = watch('excessPrice')
  const netToPay = watch('netToPay')
  const cashRegister = watch('cashRegister')

  const hasExcessPayment = !isEdit && (parseFloat(excessWeightKg ?? '') || 0) > 0
  const tarificationInactive = !isEdit && !hasExcessPayment

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

  const ticketCurrencyIri = resolveCurrencyIriByCode(currencies, currency ?? CURRENCY.USD)
  const previewEnabled =
    hasExcessPayment && !!cashRegister && !!ticketCurrencyIri && (parseFloat(netToPay) || 0) > 0
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount: netToPay ?? '0',
    currencyIri: ticketCurrencyIri,
    enabled: previewEnabled,
  })

  useEffect(() => {
    syncDerivedWeights({ updateExcessPrice: !isEdit })
  }, [syncDerivedWeights, isEdit])

  useEffect(() => {
    if (isEdit) return
    syncDerivedWeights({ updateExcessPrice: true })
  }, [exchangeRates, isEdit, syncDerivedWeights])

  const handleCurrencyChange = (nextCurrency: CheckInPatchFormData['currency']) => {
    setValue('currency', nextCurrency, { shouldValidate: true })
    const excess = computeExcessWeightFromBaggages(getValues('baggages') ?? [])
    setValue(
      'excessPrice',
      computeCheckInExcessPrice(excess, nextCurrency, exchangeRates),
      { shouldValidate: true },
    )
  }

  useEffect(() => {
    if (isEdit) return
    const excess = parseFloat(excessWeightKg ?? '') || 0
    if (excess <= 0) {
      setValue('cashRegister', '', { shouldValidate: true })
      setValue('excessPrice', '0.00', { shouldValidate: true })
      setValue('netToPay', '0.00', { shouldValidate: true })
    }
  }, [excessWeightKg, isEdit, setValue])

  useEffect(() => {
    if (isEdit) return
    setValue('netToPay', excessPrice ?? '0', { shouldValidate: true })
  }, [excessPrice, isEdit, setValue])

  const handleTicketSelect = async (ticket: Ticket) => {
    setIsLoadingTicket(true)
    try {
      const fullTicket = await ticketService.getById(ticket.id)
      setSelectedTicket(fullTicket)
      const ticketIri = fullTicket['@id'] ?? toIri('tickets', fullTicket.id)
      setValue('ticketIri', ticketIri, { shouldValidate: true, shouldDirty: true })
      setValue('baggageAllowanceKg', fullTicket.baggageAllowanceKg, {
        shouldValidate: true,
        shouldDirty: true,
      })
      setValue('currency', normalizeCurrency(fullTicket.currency), {
        shouldValidate: true,
        shouldDirty: true,
      })
      syncDerivedWeights({ updateExcessPrice: true })
    } catch {
      setSelectedTicket(ticket)
      const ticketIri = ticket['@id'] ?? toIri('tickets', ticket.id)
      setValue('ticketIri', ticketIri, { shouldValidate: true, shouldDirty: true })
      if (ticket.baggageAllowanceKg != null && ticket.baggageAllowanceKg !== '') {
        setValue('baggageAllowanceKg', ticket.baggageAllowanceKg, {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      if (ticket.currency) {
        setValue('currency', normalizeCurrency(ticket.currency), {
          shouldValidate: true,
          shouldDirty: true,
        })
      }
      syncDerivedWeights({ updateExcessPrice: true })
    } finally {
      setIsLoadingTicket(false)
    }
  }

  const handleTicketClear = () => {
    setSelectedTicket(null)
    setValue('ticketIri', '', { shouldValidate: true })
    setValue('baggageAllowanceKg', '', { shouldValidate: true })
  }

  const computedFieldsLocked = true

  const watchedBaggages = watch('baggages') ?? []

  const appendBaggage = () => {
    const baggages = getValues('baggages') ?? []
    const nextIndex = baggages.length
    const options = getAvailableBaggageTypeOptions(baggages, nextIndex)
    const handRemainder = getHandHoldHandRemainderKg(baggages)

    let nextType: BaggageType
    if (
      handRemainder != null &&
      options.some((option) => option.value === BAGGAGE_TYPE.HAND)
    ) {
      nextType = BAGGAGE_TYPE.HAND
    } else if (!isEdit && baggages.length === 1) {
      nextType = options.some((option) => option.value === BAGGAGE_TYPE.HAND)
        ? BAGGAGE_TYPE.HAND
        : ((options.find((option) => option.value !== BAGGAGE_TYPE.OVERSIZE)?.value ??
            BAGGAGE_TYPE.OVERSIZE) as BaggageType)
    } else {
      const preferred = options.find((option) => option.value !== BAGGAGE_TYPE.OVERSIZE)
      nextType = (preferred?.value ?? BAGGAGE_TYPE.OVERSIZE) as BaggageType
    }

    prepend({
      id: '',
      weight: getWeightForBaggageType(nextType, baggages, nextIndex),
      baggageType: nextType,
      description: '',
    })
    queueMicrotask(() => syncDerivedWeights({ updateExcessPrice: true }))
  }

  const handleFormSubmit = isEdit
    ? handleSubmit((data) => (onSubmit as CheckInEditFormProps['onSubmit'])(data))
    : handleSubmit((data) => (onSubmit as CheckInCreateFormProps['onSubmit'])(data as CheckInCreateFormData))

  return (
    <form id={FORM_ID} onSubmit={handleFormSubmit} className="space-y-4">
      {!isEdit && issuingOfficeName && (
        <Card className="rounded-2xl border-border/60 bg-muted/25 shadow-sm">
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-5 w-5 shrink-0 text-brand-orange" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Bureau d&apos;émission</p>
              <p className="truncate font-medium">{issuingOfficeName}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <FormSection title="Billet" icon={TicketIcon}>
        {isEdit ? (
          <>
            <Input label="Billet" value={ticketLabel ?? '—'} disabled readOnly className={fieldClass} />
            <Input
              label="Bureau d'émission"
              value={issuingOfficeLabel ?? '—'}
              disabled
              readOnly
              className={fieldClass}
            />
          </>
        ) : (
          <div className="space-y-4 sm:col-span-2">
            <HydraAutocomplete<Ticket>
              endpoint="/api/tickets"
              searchParam="ticketNumber"
              value={selectedTicket}
              getLabel={(t) => `${t.ticketNumber} — ${t.passengerName}`}
              onSelect={handleTicketSelect}
              onClear={handleTicketClear}
              error={errors.ticketIri?.message}
              label="Numéro de billet"
              placeholder="Rechercher par n° de billet ou nom..."
              inputClassName={fieldClass}
            />
            {isLoadingTicket && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderIcon />
                Chargement du billet...
              </p>
            )}
            {selectedTicket && !isLoadingTicket && <SelectedTicketCard ticket={selectedTicket} />}
          </div>
        )}
      </FormSection>

      <FormSection
        title="Bagages enregistrés"
        icon={Luggage}
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            onClick={appendBaggage}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
        }
      >
        {fields.map((field, index) => {
          const baggageId = watch(`baggages.${index}.id`)
          const baggageType = watch(`baggages.${index}.baggageType`) ?? BAGGAGE_TYPE.REGULAR
          const isExistingBaggage = isPersistedBaggageRow(field.id, baggageId)
          const isOversizeBaggage = baggageType === BAGGAGE_TYPE.OVERSIZE
          const baggageTypeOptions = isExistingBaggage
            ? BAGGAGE_TYPE_OPTIONS.filter((option) => option.value === baggageType)
            : getAvailableBaggageTypeOptions(watchedBaggages, index)
          const canRemoveBaggage = !isExistingBaggage && fields.length > 1
          const typeSelectDisabled = isExistingBaggage

          return (
            <Card key={field.id} className="rounded-xl border-border/80 shadow-sm sm:col-span-2">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">
                    Bagage {index + 1}
                    {isExistingBaggage && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">(enregistré)</span>
                    )}
                  </p>
                  {!isExistingBaggage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => {
                        remove(index)
                        queueMicrotask(() => syncDerivedWeights({ updateExcessPrice: true }))
                      }}
                      disabled={!canRemoveBaggage}
                      aria-label="Supprimer bagage"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input type="hidden" {...register(`baggages.${index}.id`)} />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label="Type"
                    options={baggageTypeOptions}
                    variant="filter"
                    value={baggageType}
                    disabled={typeSelectDisabled}
                    onChange={(e) => {
                      const nextType = e.target.value as CheckInPatchFormData['baggages'][number]['baggageType']
                      setValue(`baggages.${index}.baggageType`, nextType, { shouldValidate: true })
                      if (!isExistingBaggage) {
                        setValue(
                          `baggages.${index}.weight`,
                          getWeightForBaggageType(nextType, watchedBaggages, index),
                          { shouldValidate: true },
                        )
                      }
                      syncDerivedWeights({ updateExcessPrice: true })
                    }}
                    error={errors.baggages?.[index]?.baggageType?.message}
                  />
                  {(() => {
                    const weightField = register(`baggages.${index}.weight`)
                    return (
                      <Input
                        label={isOversizeBaggage ? 'Excédent (kg)' : 'Poids (kg)'}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        className={isExistingBaggage ? lockedFieldClass : fieldClass}
                        error={errors.baggages?.[index]?.weight?.message}
                        readOnly={isExistingBaggage}
                        tabIndex={isExistingBaggage ? -1 : undefined}
                        name={weightField.name}
                        ref={weightField.ref}
                        onBlur={weightField.onBlur}
                        onChange={(e) => {
                          if (isExistingBaggage) return
                          void weightField.onChange(e)
                          syncDerivedWeights({ updateExcessPrice: true })
                        }}
                      />
                    )
                  })()}
                  <div className="sm:col-span-2">
                    <Input
                      label="Description"
                      placeholder="Ex. Grande valise, sac à dos..."
                      className={isExistingBaggage ? lockedFieldClass : fieldClass}
                      error={errors.baggages?.[index]?.description?.message}
                      readOnly={isExistingBaggage}
                      tabIndex={isExistingBaggage ? -1 : undefined}
                      {...register(`baggages.${index}.description`)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </FormSection>

      <FormSection title="Poids" icon={Scale}>
        <div className="space-y-4 sm:col-span-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Référence billet
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Kilo total accordé"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={cn(fieldClass, computedFieldsLocked && 'cursor-not-allowed bg-muted/60')}
                error={errors.baggageAllowanceKg?.message}
                readOnly={computedFieldsLocked}
                tabIndex={computedFieldsLocked ? -1 : undefined}
                {...register('baggageAllowanceKg')}
              />
              <Input
                label="Date d'encodage"
                type="date"
                className={fieldClass}
                error={errors.encodedAt?.message}
                {...register('encodedAt')}
              />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Poids enregistrés
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Bagage Soute (kg)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={cn(fieldClass, computedFieldsLocked && 'cursor-not-allowed bg-muted/60')}
                error={errors.checkInWeight?.message}
                readOnly={computedFieldsLocked}
                tabIndex={computedFieldsLocked ? -1 : undefined}
                {...register('checkInWeight')}
              />
              <Input
                label="Bagage à main (kg)"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0,00"
                className={cn(fieldClass, computedFieldsLocked && 'cursor-not-allowed bg-muted/60')}
                error={errors.handBaggageWeight?.message}
                readOnly={computedFieldsLocked}
                tabIndex={computedFieldsLocked ? -1 : undefined}
                {...register('handBaggageWeight')}
              />
            </div>
          </div>

          <div
            className={cn(
              'rounded-xl px-4 py-3',
              (parseFloat(excessWeightKg ?? '') || 0) > 0
                ? 'bg-brand-orange/10'
                : 'border border-border/60 bg-muted/20',
            )}
          >
            <Input
              label="Excédent (kg)"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0,00"
              className={cn(fieldClass, computedFieldsLocked && 'cursor-not-allowed bg-muted/60')}
              error={errors.excessWeightKg?.message}
              readOnly={computedFieldsLocked}
              tabIndex={computedFieldsLocked ? -1 : undefined}
              {...register('excessWeightKg')}
            />
          </div>

          <Input
            label="Observations"
            placeholder="Remarques éventuelles..."
            className={fieldClass}
            error={errors.observations?.message}
            {...register('observations')}
          />
        </div>
      </FormSection>

      {!isEdit && (
      <FormSection
        title="Tarification"
        icon={Banknote}
        className={tarificationInactive ? 'border-border/50 bg-muted/20' : undefined}
      >
        {tarificationInactive && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Aucun excédent bagage — la tarification n&apos;est pas requise. Vous pouvez enregistrer le check-in
            directement.
          </p>
        )}
        {!isEdit && hasExcessPayment && (
          <div className="sm:col-span-2">
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
          </div>
        )}
        <Select
          label="Devise"
          options={CURRENCY_OPTIONS}
          error={errors.currency?.message}
          variant="filter"
          disabled={isEdit || tarificationInactive}
          value={currency ?? CURRENCY.USD}
          onChange={(e) => handleCurrencyChange(e.target.value as CheckInPatchFormData['currency'])}
        />
        <Input
          label="Prix excédent"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0,00"
          className={isEdit || tarificationInactive ? lockedFieldClass : fieldClass}
          error={errors.excessPrice?.message}
          readOnly={isEdit || tarificationInactive}
          tabIndex={isEdit || tarificationInactive ? -1 : undefined}
          {...register('excessPrice')}
        />
        {!tarificationInactive && (
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Calcul auto : {CHECK_IN_EXCESS_PRICE_PER_KG_USD} $ / kg
            {currency === CURRENCY.CDF ? ' (converti en CDF via le taux de change actif)' : ''}
            {isEdit ? ' — mis à jour automatiquement' : ' — modifiable'}
          </p>
        )}
        <Input
          label="Net à payer"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0,00"
          className={isEdit || tarificationInactive ? lockedFieldClass : fieldClass}
          error={errors.netToPay?.message}
          readOnly={isEdit || tarificationInactive}
          tabIndex={isEdit || tarificationInactive ? -1 : undefined}
          {...register('netToPay')}
        />
        {!tarificationInactive && (
          <div className="flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-semibold">Net à payer</span>
            <span className="text-lg font-bold tabular-nums text-brand-orange">
              {formatMoney(parseFloat(netToPay) || 0, currency ?? CURRENCY.USD)}
            </span>
          </div>
        )}
        {previewEnabled && (
          <ConversionPreviewCard
            preview={conversionPreview}
            isLoading={conversionPreviewLoading}
            isError={conversionPreviewError}
          />
        )}
      </FormSection>
      )}

      <input type="hidden" {...register('ticketIri')} />

      <CheckInFormActions
        formId={FORM_ID}
        canSubmit={isValid}
        isLoading={isLoading}
        submitLabel={submitLabel}
        cancelHref={cancelHref}
      />
    </form>
  )
}
