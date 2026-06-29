import { useEffect, useMemo, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { LoaderIcon } from '@/components/ui/loading-spinner'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import {
  Banknote,
  Building2,
  CreditCard,
  Lock,
  MapPin,
  User,
} from 'lucide-react'
import { ticketSchema, ticketPatchSchema, type TicketFormData, type TicketPatchFormData } from '@/schemas/ticket.schema'
import { GENDER_LABELS, PAYMENT_MODE, PAYMENT_MODE_LABELS, PAYMENT_MODE_OPTIONS, CURRENCY, CURRENCY_OPTIONS } from '@/constants/ticket'
import { useAuth } from '@/hooks/useAuth'
import { useCashRegistersForSelect } from '@/hooks/useCashRegisters'
import { useCurrenciesForSelect } from '@/hooks/useCurrencies'
import { usePreviewConversion } from '@/hooks/usePreviewConversion'
import { getCashRegisterCurrencyCode } from '@/lib/cash-register'
import { resolveCurrencyIriByCode } from '@/lib/currency-resource'
import { extractIri } from '@/lib/hydra'
import { resolveUserIssuingOfficeIri } from '@/lib/issuing-office'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckpointAsyncSelect } from '@/components/ui/checkpoint-async-select'
import { ConversionPreviewCard } from '@/components/tickets/ConversionPreviewCard'
import { formatMoney } from '@/lib/utils'
import { getTicketTotal, getTodayTravelDateInput, getCurrentTravelTimeInput } from '@/lib/ticket'

const FORM_ID = 'ticket-form'

const fieldClass =
  'h-11 rounded-xl border-transparent bg-muted/40 focus-visible:bg-background focus-visible:border-input'

interface TicketFormBaseProps {
  defaultValues?: Partial<TicketFormData>
  isLoading?: boolean
  submitLabel?: string
  cancelHref?: string
  readOnly?: boolean
  ticketNumber?: string
  issuingOfficeLabel?: string
  statusLabel?: string
}

interface TicketCreateFormProps extends TicketFormBaseProps {
  isEdit?: false
  onSubmit: (data: TicketFormData) => void
}

interface TicketEditFormProps extends TicketFormBaseProps {
  isEdit: true
  onSubmit: (data: TicketPatchFormData) => void
}

export type TicketFormProps = TicketCreateFormProps | TicketEditFormProps

function FormSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: typeof User
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

function TicketFormActions({
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
      <div className="hidden lg:flex flex-col items-end gap-3 pt-2">
        <div className="flex gap-3">
          {cancelHref && (
            <Button type="button" variant="outline" asChild className="h-11 rounded-xl">
              <Link to={cancelHref}>Annuler</Link>
            </Button>
          )}
          <Button type="submit" disabled={!canSubmit} className="h-11 rounded-xl px-8">
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
            disabled={!canSubmit}
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

function TicketCreateForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref,
  readOnly = false,
}: TicketCreateFormProps) {
  const { user, issuingOfficeName } = useAuth()
  const issuingOfficeIri = resolveUserIssuingOfficeIri(user)
  const { data: cashRegisters = [], isLoading: cashRegistersLoading } = useCashRegistersForSelect(issuingOfficeIri)
  const { data: currencies = [] } = useCurrenciesForSelect()
  const locked = readOnly

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
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      paymentMode: PAYMENT_MODE.CASH,
      currency: CURRENCY.USD,
      travelDate: getTodayTravelDateInput(),
      travelTime: getCurrentTravelTimeInput(),
      basePrice: '0.00',
      tva: '0.00',
      fpt: '0.00',
      rva: '0.00',
      baggageAllowanceKg: '20',
      cashRegister: '',
      reserveForLater: false,
      ...defaultValues,
    },
  })

  const paymentMode = watch('paymentMode')
  const departure = watch('departure')
  const destination = watch('destination')
  const basePrice = watch('basePrice')
  const currency = watch('currency')
  const tva = watch('tva')
  const fpt = watch('fpt')
  const rva = watch('rva')
  const cashRegister = watch('cashRegister')
  const reserveForLater = watch('reserveForLater')

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

  const handleCashRegisterChange = (iri: string) => {
    setValue('cashRegister', iri, { shouldValidate: true })
  }

  useEffect(() => {
    if (paymentMode !== PAYMENT_MODE.CASH) {
      setValue('cashRegister', '', { shouldValidate: true })
      setValue('reserveForLater', false, { shouldValidate: true })
    }
  }, [paymentMode, setValue])

  useEffect(() => {
    if (reserveForLater) {
      setValue('cashRegister', '', { shouldValidate: true })
      setValue('paymentMode', PAYMENT_MODE.CASH, { shouldValidate: true })
    }
  }, [reserveForLater, setValue])

  const totalPreview = getTicketTotal({ basePrice, tva, fpt, rva })
  const ticketCurrencyIri = resolveCurrencyIriByCode(currencies, currency ?? CURRENCY.USD)
  const previewEnabled =
    paymentMode === PAYMENT_MODE.CASH && !reserveForLater && !!cashRegister && !!ticketCurrencyIri
  const {
    data: conversionPreview,
    isLoading: conversionPreviewLoading,
    isError: conversionPreviewError,
  } = usePreviewConversion({
    cashRegister: cashRegister || undefined,
    amount: String(totalPreview),
    currencyIri: ticketCurrencyIri,
    enabled: previewEnabled,
  })

  const canSubmit = !locked && !isLoading
  const officeLabel = issuingOfficeName
  const resolvedSubmitLabel = reserveForLater ? 'Réserver le billet' : submitLabel

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {officeLabel && (
          <Card className="rounded-2xl border-border/60 bg-muted/25 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <Building2 className="h-5 w-5 shrink-0 text-brand-orange" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Bureau d'émission</p>
                <p className="truncate font-medium">{officeLabel}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <FormSection title="Passager" icon={User}>
          <Input
            label="Nom complet"
            placeholder="Nom et prénom du passager"
            error={errors.passengerName?.message}
            disabled={locked}
            className={fieldClass}
            {...register('passengerName')}
          />
          <Input
            label="Âge"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            error={errors.age?.message}
            disabled={locked}
            className={fieldClass}
            {...register('age', { valueAsNumber: true })}
          />
          <Select
            label="Sexe"
            placeholder="Sélectionner..."
            options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))}
            error={errors.gender?.message}
            disabled={locked}
            variant="filter"
            className={fieldClass}
            {...register('gender')}
          />
          <Input
            label="Téléphone"
            type="tel"
            inputMode="tel"
            placeholder="+243..."
            error={errors.phone?.message}
            disabled={locked}
            className={fieldClass}
            {...register('phone')}
          />
        </FormSection>

        <FormSection title="Voyage" icon={MapPin}>
          <div className="sm:col-span-2">
            <CheckpointAsyncSelect
              label="Départ"
              placeholder="Rechercher le checkpoint de départ..."
              initialCheckpointIri={defaultValues?.departure}
              value={departure ?? ''}
              onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
              error={errors.departure?.message}
              disabled={locked}
              variant="filter"
            />
          </div>
          <div className="sm:col-span-2">
            <CheckpointAsyncSelect
              label="Destination"
              placeholder="Rechercher le checkpoint de destination..."
              initialCheckpointIri={defaultValues?.destination}
              value={destination ?? ''}
              onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
              error={errors.destination?.message}
              disabled={locked}
              variant="filter"
            />
          </div>
          <Input
            label="Date de voyage"
            type="date"
            error={errors.travelDate?.message}
            disabled={locked}
            className={fieldClass}
            {...register('travelDate')}
          />
          <Input
            label="Heure de voyage"
            type="time"
            error={errors.travelTime?.message}
            disabled={locked}
            className={fieldClass}
            {...register('travelTime')}
          />
        </FormSection>

        <FormSection title="Tarification" icon={Banknote}>
          <Select
            label="Devise"
            options={CURRENCY_OPTIONS}
            error={errors.currency?.message}
            disabled={locked}
            variant="filter"
            value={currency ?? CURRENCY.USD}
            onChange={(e) => setValue('currency', e.target.value as TicketFormData['currency'], { shouldValidate: true })}
          />
          <Input label="Prix de base" inputMode="decimal" error={errors.basePrice?.message} disabled={locked} className={fieldClass} {...register('basePrice')} />
          <Input label="TVA" inputMode="decimal" error={errors.tva?.message} disabled={locked} className={fieldClass} {...register('tva')} />
          <Input label="FPT" inputMode="decimal" error={errors.fpt?.message} disabled={locked} className={fieldClass} {...register('fpt')} />
          <Input label="RVA" inputMode="decimal" error={errors.rva?.message} disabled={locked} className={fieldClass} {...register('rva')} />
          <Input
            label="Kilo total accordé"
            inputMode="decimal"
            error={errors.baggageAllowanceKg?.message}
            disabled={locked}
            className={fieldClass}
            {...register('baggageAllowanceKg')}
          />
          <div className="flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-semibold">Total estimé</span>
            <span className="text-lg font-bold tabular-nums text-brand-orange">{formatMoney(totalPreview, currency ?? CURRENCY.USD)}</span>
          </div>
        </FormSection>

        <FormSection title="Paiement" icon={CreditCard}>
          <div className="space-y-4 sm:col-span-2">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                reserveForLater
                  ? 'border-brand-orange/40 bg-brand-orange/5'
                  : 'border-border/60 bg-muted/20'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input"
                disabled={locked}
                {...register('reserveForLater')}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium">Réserver (payer plus tard)</span>
                <span className="block text-xs text-muted-foreground">
                  Le billet sera créé en statut Réservé sans encaissement immédiat.
                </span>
              </span>
            </label>

            {reserveForLater ? (
              <div className="rounded-xl border border-brand-orange/25 bg-brand-orange/5 px-4 py-3 text-sm text-muted-foreground">
                Encaissement différé — vous pourrez encaisser le billet depuis sa fiche une fois le
                passager prêt à payer.
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Encaissement immédiat
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label="Mode de paiement"
                    options={PAYMENT_MODE_OPTIONS}
                    error={errors.paymentMode?.message}
                    disabled={locked}
                    variant="filter"
                    value={watch('paymentMode') ?? ''}
                    onChange={(e) =>
                      setValue('paymentMode', e.target.value as TicketFormData['paymentMode'], {
                        shouldValidate: true,
                      })
                    }
                  />
                  {paymentMode === PAYMENT_MODE.SPONSOR && (
                    <Input
                      label="Sponsor"
                      error={errors.sponsor?.message}
                      disabled={locked}
                      className={fieldClass}
                      {...register('sponsor')}
                    />
                  )}
                  {paymentMode === PAYMENT_MODE.CASH && (
                    <Select
                      label="Caisse"
                      placeholder={
                        cashRegistersLoading
                          ? 'Chargement des caisses...'
                          : cashRegisterOptions.length
                            ? 'Sélectionner une caisse...'
                            : 'Aucune caisse active'
                      }
                      options={cashRegisterOptions}
                      error={errors.cashRegister?.message}
                      disabled={locked || cashRegistersLoading || cashRegisterOptions.length === 0}
                      variant="filter"
                      value={cashRegister ?? ''}
                      onChange={(e) => handleCashRegisterChange(e.target.value)}
                    />
                  )}
                </div>
                {previewEnabled && (
                  <ConversionPreviewCard
                    preview={conversionPreview}
                    isLoading={conversionPreviewLoading}
                    isError={conversionPreviewError}
                  />
                )}
              </div>
            )}
          </div>
        </FormSection>

        {!locked && (
          <TicketFormActions
            formId={FORM_ID}
            canSubmit={canSubmit}
            isLoading={isLoading}
            submitLabel={resolvedSubmitLabel}
            cancelHref={cancelHref}
          />
        )}
      </form>
    </>
  )
}

function TicketEditForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Enregistrer',
  cancelHref,
  readOnly = false,
  ticketNumber,
  issuingOfficeLabel,
  statusLabel,
}: TicketEditFormProps) {
  const { issuingOfficeName } = useAuth()
  const locked = readOnly

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketPatchFormData>({
    resolver: zodResolver(ticketPatchSchema),
    defaultValues: {
      passengerName: defaultValues?.passengerName ?? '',
      age: defaultValues?.age,
      gender: defaultValues?.gender,
      phone: defaultValues?.phone ?? '',
      departure: defaultValues?.departure ?? '',
      destination: defaultValues?.destination ?? '',
      travelDate: defaultValues?.travelDate ?? '',
      travelTime: defaultValues?.travelTime ?? '',
      sponsor: defaultValues?.sponsor ?? '',
    },
  })

  const departure = watch('departure')
  const destination = watch('destination')
  const paymentMode = defaultValues?.paymentMode ?? PAYMENT_MODE.CASH

  const totalPreview = getTicketTotal({
    basePrice: defaultValues?.basePrice ?? '0',
    tva: defaultValues?.tva ?? '0',
    fpt: defaultValues?.fpt ?? '0',
    rva: defaultValues?.rva ?? '0',
  })

  const canSubmit = !locked && !isLoading
  const officeLabel = issuingOfficeLabel ?? issuingOfficeName

  return (
    <>
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card className="rounded-2xl border-border/80 bg-muted/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Lock className="h-4 w-4" aria-hidden="true" />
              </span>
              Non modifiable
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 pt-0 sm:grid-cols-2">
            {ticketNumber && (
              <Input label="N° billet" value={ticketNumber} disabled readOnly className={fieldClass} />
            )}
            <Input
              label="Bureau d'émission"
              value={officeLabel ?? '—'}
              disabled
              readOnly
              className={fieldClass}
            />
            {statusLabel && (
              <Input label="Statut" value={statusLabel} disabled readOnly className={fieldClass} />
            )}
          </CardContent>
        </Card>

        <FormSection title="Passager" icon={User}>
          <Input
            label="Nom complet"
            placeholder="Nom et prénom du passager"
            error={errors.passengerName?.message}
            disabled={locked}
            className={fieldClass}
            {...register('passengerName')}
          />
          <Input
            label="Âge"
            type="number"
            inputMode="numeric"
            min={1}
            max={120}
            error={errors.age?.message}
            disabled={locked}
            className={fieldClass}
            {...register('age', { valueAsNumber: true })}
          />
          <Select
            label="Sexe"
            placeholder="Sélectionner..."
            options={Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }))}
            error={errors.gender?.message}
            disabled={locked}
            variant="filter"
            className={fieldClass}
            {...register('gender')}
          />
          <Input
            label="Téléphone"
            type="tel"
            inputMode="tel"
            placeholder="+243..."
            error={errors.phone?.message}
            disabled={locked}
            className={fieldClass}
            {...register('phone')}
          />
        </FormSection>

        <FormSection title="Voyage" icon={MapPin}>
          <div className="sm:col-span-2">
            <CheckpointAsyncSelect
              label="Départ"
              placeholder="Rechercher le checkpoint de départ..."
              initialCheckpointIri={defaultValues?.departure}
              value={departure ?? ''}
              onChange={(iri) => setValue('departure', iri, { shouldValidate: true })}
              error={errors.departure?.message}
              disabled={locked}
              variant="filter"
            />
          </div>
          <div className="sm:col-span-2">
            <CheckpointAsyncSelect
              label="Destination"
              placeholder="Rechercher le checkpoint de destination..."
              initialCheckpointIri={defaultValues?.destination}
              value={destination ?? ''}
              onChange={(iri) => setValue('destination', iri, { shouldValidate: true })}
              error={errors.destination?.message}
              disabled={locked}
              variant="filter"
            />
          </div>
          <Input
            label="Date de voyage"
            type="date"
            error={errors.travelDate?.message}
            disabled={locked}
            className={fieldClass}
            {...register('travelDate')}
          />
          <Input
            label="Heure de voyage"
            type="time"
            error={errors.travelTime?.message}
            disabled={locked}
            className={fieldClass}
            {...register('travelTime')}
          />
        </FormSection>

        <FormSection title="Tarification" icon={Banknote}>
          <Input
            label="Devise"
            value={defaultValues?.currency ?? CURRENCY.USD}
            disabled
            readOnly
            className={fieldClass}
          />
          <Input label="Prix de base" value={defaultValues?.basePrice ?? ''} disabled readOnly className={fieldClass} />
          <Input label="TVA" value={defaultValues?.tva ?? ''} disabled readOnly className={fieldClass} />
          <Input label="FPT" value={defaultValues?.fpt ?? ''} disabled readOnly className={fieldClass} />
          <Input label="RVA" value={defaultValues?.rva ?? ''} disabled readOnly className={fieldClass} />
          <Input
            label="Kilo total accordé"
            value={defaultValues?.baggageAllowanceKg ?? ''}
            disabled
            readOnly
            className={fieldClass}
          />
          <div className="flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums text-brand-orange">
              {formatMoney(totalPreview, defaultValues?.currency ?? CURRENCY.USD)}
            </span>
          </div>
        </FormSection>

        <FormSection title="Paiement" icon={CreditCard}>
          <Input
            label="Mode de paiement"
            value={PAYMENT_MODE_LABELS[paymentMode as keyof typeof PAYMENT_MODE_LABELS] ?? paymentMode}
            disabled
            readOnly
            className={fieldClass}
          />
          <Input
            label="Sponsor"
            error={errors.sponsor?.message}
            disabled={locked}
            className={fieldClass}
            {...register('sponsor')}
          />
        </FormSection>

        {!locked && (
          <TicketFormActions
            formId={FORM_ID}
            canSubmit={canSubmit}
            isLoading={isLoading}
            submitLabel={submitLabel}
            cancelHref={cancelHref}
          />
        )}

        {readOnly && (
          <p className="text-sm text-muted-foreground text-center lg:text-right">
            Ce billet ne peut plus être modifié (statut autre que Émis).
          </p>
        )}
      </form>
    </>
  )
}

export function TicketForm(props: TicketFormProps) {
  if (props.isEdit) {
    return <TicketEditForm {...props} />
  }
  return <TicketCreateForm {...props} />
}
