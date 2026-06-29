import { useMemo, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Banknote,
  Ban,
  Box,
  FileText,
  History,
  MessageSquare,
  Package,
  Pencil,
  Plane,
  Receipt,
  RefreshCw,
  Send,
  User,
} from 'lucide-react'
import {
  useFreightShipment,
  useUpdateFreightStatus,
  useUpdateFreightPackage,
} from '@/hooks/useFreight'
import { useCreateCashTransaction } from '@/hooks/useCashTransactions'
import { useFreightActivities } from '@/hooks/useActivities'
import { mergeFreightHistory } from '@/lib/freight-history'
import { EntityHistoryTimeline } from '@/components/history/EntityHistoryTimeline'
import { RelatedCashTransactionsPanel } from '@/components/cash-transactions/RelatedCashTransactionsPanel'
import { CASH_TRANSACTION_REFERENCE_TYPE } from '@/constants/cash-transaction'
import {
  FREIGHT_STATUS,
  FREIGHT_STATUS_LABELS,
  FREIGHT_STATUS_TRANSITIONS,
  FREIGHT_PAYMENT_MODE_LABELS,
  PACKAGING_TYPE_LABELS,
  NATURE_OF_GOODS_LABELS,
  freightStatusBadgeVariant,
  freightStatusSelectClass,
  type FreightStatus,
} from '@/constants/freight'
import { FreightPackageForm } from '@/components/forms/FreightPackageForm'
import { FreightDeliveryPaymentModal, type FreightDeliveryPaymentResult } from '@/components/freight/FreightDeliveryPaymentModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatMoney, formatDateTime, cn } from '@/lib/utils'
import {
  formatFreightWeight,
  getFreightIssuingOfficeLabel,
  hasFreightObservations,
  packageToFormDefaults,
  shouldCollectFreightRemainingOnDelivery,
  toFreightPackagePatchPayload,
} from '@/lib/freight'
import { useCheckpointLabel } from '@/hooks/useCheckpoints'
import type { FreightPackage } from '@/types/freight-shipment'
import type { Checkpoint } from '@/types/checkpoint'
import type { FreightPackageFormData } from '@/schemas/freight.schema'

function DetailSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string
  icon: typeof Package
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('rounded-2xl border-border/80 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  mono,
  highlight,
  href,
}: {
  label: string
  value: ReactNode
  mono?: boolean
  highlight?: boolean
  href?: string
}) {
  const content = (
    <span
      className={cn(
        'break-words text-right text-sm font-medium',
        mono && 'font-mono text-xs',
        highlight && 'font-semibold text-brand-orange',
      )}
    >
      {value}
    </span>
  )

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-3 last:border-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      {href ? (
        <a href={href} className="text-right text-sm font-medium text-primary hover:underline break-all">
          {value}
        </a>
      ) : (
        content
      )}
    </div>
  )
}

function CheckpointDetailRow({
  title,
  checkpoint,
}: {
  title: string
  checkpoint: string | Checkpoint
}) {
  const { label, isLoading } = useCheckpointLabel(checkpoint)

  return (
    <DetailRow
      label={title}
      value={isLoading ? 'Chargement…' : (label ?? '—')}
    />
  )
}

function PackageCard({
  pkg,
  canEdit,
  onEdit,
}: {
  pkg: FreightPackage
  canEdit: boolean
  onEdit: (pkg: FreightPackage) => void
}) {
  return (
    <Card className="rounded-xl border-border/80 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-primary truncate">{pkg.packageNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {PACKAGING_TYPE_LABELS[pkg.packagingType]} · {NATURE_OF_GOODS_LABELS[pkg.natureOfGoods]}
            </p>
          </div>
          {canEdit && (
            <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-lg" onClick={() => onEdit(pkg)}>
              <Pencil className="h-3.5 w-3.5" />
              Modifier
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Poids unitaire</span>
          <span className="font-medium tabular-nums">{formatFreightWeight(pkg.unitWeight)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Poids total</span>
          <span className="font-semibold tabular-nums">{formatFreightWeight(pkg.totalWeight)}</span>
        </div>
      </CardContent>
    </Card>
  )
}

type FreightDetailTab = 'details' | 'transactions' | 'history'

function DetailTabs({
  value,
  onChange,
}: {
  value: FreightDetailTab
  onChange: (tab: FreightDetailTab) => void
}) {
  const tabClass = (active: boolean) =>
    cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-colors sm:gap-2',
      active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
    )

  return (
    <div
      className="flex rounded-xl border border-border/80 bg-muted/40 p-1"
      role="tablist"
      aria-label="Sections de l'expédition"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === 'details'}
        className={tabClass(value === 'details')}
        onClick={() => onChange('details')}
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Détails
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'transactions'}
        className={tabClass(value === 'transactions')}
        onClick={() => onChange('transactions')}
      >
        <Receipt className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">Transactions</span>
        <span className="sm:hidden">Tx</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'history'}
        className={tabClass(value === 'history')}
        onClick={() => onChange('history')}
      >
        <History className="h-4 w-4 shrink-0" aria-hidden="true" />
        Historique
      </button>
    </div>
  )
}

function FreightActions({
  shipmentId,
  canEdit,
  canChangeStatus,
  onStatus,
  pending,
  className,
  layout = 'desktop',
}: {
  shipmentId: string
  canEdit: boolean
  canChangeStatus: boolean
  onStatus: () => void
  pending: boolean
  className?: string
  layout?: 'desktop' | 'mobile'
}) {
  const btnClass = 'h-11 rounded-xl font-semibold'

  if (!canEdit && !canChangeStatus) return null

  if (layout === 'mobile') {
    return (
      <div className={cn('space-y-2', className)}>
        {canEdit && (
          <Button variant="outline" asChild className={cn(btnClass, 'w-full border-primary/30 text-primary hover:bg-primary/5')}>
            <Link to={`/freight/${shipmentId}/edit`}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Link>
          </Button>
        )}
        {canChangeStatus && (
          <Button
            type="button"
            className={cn(btnClass, 'w-full bg-brand-orange text-white hover:bg-brand-orange/90')}
            onClick={onStatus}
            disabled={pending}
          >
            <RefreshCw className="h-4 w-4" />
            Changer le statut
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {canEdit && (
        <Button variant="outline" asChild className={cn(btnClass, 'border-primary/30 text-primary hover:bg-primary/5')}>
          <Link to={`/freight/${shipmentId}/edit`}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Link>
        </Button>
      )}
      {canChangeStatus && (
        <Button
          type="button"
          className={cn(btnClass, 'bg-brand-orange text-white hover:bg-brand-orange/90')}
          onClick={onStatus}
          disabled={pending}
        >
          <RefreshCw className="h-4 w-4" />
          Changer le statut
        </Button>
      )}
    </div>
  )
}

export function FreightDetailPage() {
  const { id } = useParams<{ id: string }>()
  const shipmentId = id ?? ''
  const { data: shipment, isLoading } = useFreightShipment(shipmentId)
  const { data: activitiesData, isLoading: activitiesLoading } = useFreightActivities(shipmentId)
  const updateStatus = useUpdateFreightStatus()
  const updatePackage = useUpdateFreightPackage()
  const createTransaction = useCreateCashTransaction()

  const [statusModalOpen, setStatusModalOpen] = useState(false)
  const [deliveryPaymentModalOpen, setDeliveryPaymentModalOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [editingPackage, setEditingPackage] = useState<FreightPackage | null>(null)
  const [activeTab, setActiveTab] = useState<FreightDetailTab>('details')

  const historyEntries = useMemo(() => {
    if (!shipment) return []
    return mergeFreightHistory(shipment, activitiesData?.items ?? [])
  }, [shipment, activitiesData?.items])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner label="Chargement de l'expédition..." />
      </div>
    )
  }

  if (!shipment) {
    return (
      <EmptyState
        icon={Package}
        title="Expédition introuvable"
        description="Cette expédition n'existe pas ou a été supprimée."
        action={{ label: 'Retour au fret', onClick: () => { window.location.href = '/freight' } }}
      />
    )
  }

  const canEdit = shipment.status === FREIGHT_STATUS.PENDING
  const canChangeStatus =
    shipment.status !== FREIGHT_STATUS.DELIVERED && shipment.status !== FREIGHT_STATUS.CANCELLED
  const packages = shipment.packages ?? []
  const money = (amount: string | number) => formatMoney(parseFloat(String(amount)) || 0)
  const totalAmount = parseFloat(shipment.totalAmount) || 0
  const remainingAmount = parseFloat(shipment.remainingAmount) || 0
  const showObservations = hasFreightObservations(shipment.observations)

  const statusOptions = FREIGHT_STATUS_TRANSITIONS.filter((value) => value !== shipment.status).map(
    (value) => ({ value, label: FREIGHT_STATUS_LABELS[value] }),
  )

  const handleUpdateStatus = async () => {
    if (!newStatus) return

    if (
      newStatus === FREIGHT_STATUS.DELIVERED
      && shouldCollectFreightRemainingOnDelivery(shipment)
    ) {
      setStatusModalOpen(false)
      setDeliveryPaymentModalOpen(true)
      return
    }

    await updateStatus.mutateAsync({ id: shipmentId, status: newStatus as FreightStatus })
    setStatusModalOpen(false)
    setNewStatus('')
  }

  const handleDeliveryPaymentConfirm = async ({ transaction }: FreightDeliveryPaymentResult) => {
    await createTransaction.mutateAsync(transaction)
    await updateStatus.mutateAsync({ id: shipmentId, status: FREIGHT_STATUS.DELIVERED })
    setDeliveryPaymentModalOpen(false)
    setNewStatus('')
  }

  const handlePackageSubmit = async (data: FreightPackageFormData) => {
    if (!editingPackage) return
    await updatePackage.mutateAsync({
      id: editingPackage.id,
      shipmentId,
      payload: toFreightPackagePatchPayload(data),
    })
    setEditingPackage(null)
  }

  const actionPending = updateStatus.isPending || createTransaction.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-44 lg:max-w-4xl lg:pb-6">
      <Link
        to="/freight"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Fret
      </Link>

      <Card className="overflow-hidden rounded-2xl border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expédition</p>
                <h1 className="mt-0.5 truncate text-xl font-bold tracking-tight sm:text-2xl">
                  {shipment.ltaNumber}
                </h1>
                <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{shipment.id}</p>
              </div>
              <Badge
                variant={freightStatusBadgeVariant(shipment.status) as 'default'}
                className="shrink-0 px-3 py-1 text-sm"
              >
                {FREIGHT_STATUS_LABELS[shipment.status]}
              </Badge>
            </div>

            <div className="flex items-end justify-between gap-4 border-t border-border/60 pt-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Compagnie</p>
                <p className="truncate text-lg font-semibold">{shipment.airline}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDateTime(shipment.shipmentDate)} · {shipment.packageCount} colis
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tabular-nums text-brand-orange">{money(shipment.totalAmount)}</p>
                {remainingAmount > 0 && (
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Reste {money(shipment.remainingAmount)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetailTabs value={activeTab} onChange={setActiveTab} />

      {(canEdit || canChangeStatus) && activeTab === 'details' && (
        <FreightActions
          shipmentId={shipment.id}
          canEdit={canEdit}
          canChangeStatus={canChangeStatus}
          onStatus={() => { setNewStatus(''); setStatusModalOpen(true) }}
          pending={actionPending}
          className="hidden lg:flex lg:justify-end"
        />
      )}

      {activeTab === 'details' ? (
      <>
      <div className="grid gap-4 lg:grid-cols-2">
        <DetailSection title="Expédition" icon={Plane}>
          <DetailRow label="Compagnie" value={shipment.airline} />
          <DetailRow label="Avion" value={shipment.aircraft} />
          <DetailRow label="Immatriculation" value={shipment.registration} mono />
          <DetailRow label="Date" value={formatDateTime(shipment.shipmentDate)} />
          <CheckpointDetailRow title="Chargement" checkpoint={shipment.loadingPlace} />
          <CheckpointDetailRow title="Déchargement" checkpoint={shipment.unloadingPlace} />
          <DetailRow label="Bureau" value={getFreightIssuingOfficeLabel(shipment)} />
          <DetailRow label="Colis" value={String(shipment.packageCount)} />
        </DetailSection>

        <DetailSection title="Tarification" icon={Banknote}>
          <DetailRow label="Poids total" value={formatFreightWeight(shipment.totalWeight)} />
          <DetailRow label="Fret ordinaire" value={money(shipment.ordinaryFreight)} />
          <DetailRow label="Fret volume" value={money(shipment.volumeFreight)} />
          <DetailRow label="RVA" value={money(shipment.rva)} />
          <DetailRow label="Frais LTA" value={money(shipment.ltaFees)} />
          <DetailRow label="Mode" value={FREIGHT_PAYMENT_MODE_LABELS[shipment.paymentMode]} />
          <DetailRow label="Payé" value={money(shipment.paidAmount)} />
          <DetailRow
            label="Reste"
            value={money(shipment.remainingAmount)}
            highlight={remainingAmount > 0}
          />
          <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-orange/10 px-4 py-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-lg font-bold tabular-nums text-brand-orange">{money(totalAmount)}</span>
          </div>
        </DetailSection>

        <DetailSection title="Expéditeur" icon={Send}>
          <DetailRow label="Nom" value={shipment.senderName} />
          <DetailRow label="Adresse" value={shipment.senderAddress} />
          {shipment.senderPhone && (
            <DetailRow label="Téléphone" value={shipment.senderPhone} href={`tel:${shipment.senderPhone}`} />
          )}
        </DetailSection>

        <DetailSection title="Destinataire" icon={User}>
          <DetailRow label="Nom" value={shipment.receiverName} />
          <DetailRow label="Adresse" value={shipment.receiverAddress} />
          {shipment.receiverPhone && (
            <DetailRow label="Téléphone" value={shipment.receiverPhone} href={`tel:${shipment.receiverPhone}`} />
          )}
        </DetailSection>

        {showObservations && (
          <DetailSection title="Observations" icon={MessageSquare} className="lg:col-span-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{shipment.observations}</p>
          </DetailSection>
        )}
      </div>

      {!canEdit && !canChangeStatus && activeTab === 'details' && (
        <Card className="rounded-2xl border-border/60 bg-muted/30">
          <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
            <Ban className="h-5 w-5 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            Cette expédition est {FREIGHT_STATUS_LABELS[shipment.status].toLowerCase()} et ne peut plus être modifiée.
          </CardContent>
        </Card>
      )}

      <DetailSection title={`Colis (${packages.length})`} icon={Box} className="lg:col-span-2">
        {packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun colis enregistré.</p>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {packages.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  canEdit={canEdit}
                  onEdit={setEditingPackage}
                />
              ))}
            </div>
            <div className="hidden lg:block overflow-hidden rounded-xl border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>N° colis</TableHead>
                    <TableHead>Emballage</TableHead>
                    <TableHead>Nature</TableHead>
                    <TableHead>Poids unitaire</TableHead>
                    <TableHead>Poids total</TableHead>
                    {canEdit && <TableHead className="w-24" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-mono text-xs">{pkg.packageNumber}</TableCell>
                      <TableCell>{PACKAGING_TYPE_LABELS[pkg.packagingType]}</TableCell>
                      <TableCell>{NATURE_OF_GOODS_LABELS[pkg.natureOfGoods]}</TableCell>
                      <TableCell className="tabular-nums">{formatFreightWeight(pkg.unitWeight)}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatFreightWeight(pkg.totalWeight)}</TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="rounded-lg" onClick={() => setEditingPackage(pkg)}>
                            Modifier
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DetailSection>
      </>
      ) : activeTab === 'transactions' ? (
        <RelatedCashTransactionsPanel
          referenceType={CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT}
          referenceId={shipment.id}
          emptyDescription="Aucune transaction caisse liée à cette expédition."
        />
      ) : (
        <EntityHistoryTimeline entries={historyEntries} isLoading={activitiesLoading} />
      )}

      {(canEdit || canChangeStatus) && activeTab === 'details' && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:hidden">
          <div className="mx-auto max-w-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <FreightActions
              shipmentId={shipment.id}
              canEdit={canEdit}
              canChangeStatus={canChangeStatus}
              onStatus={() => { setNewStatus(''); setStatusModalOpen(true) }}
              pending={actionPending}
              layout="mobile"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={statusModalOpen}
        onOpenChange={(open) => {
          if (!open && !actionPending) {
            setStatusModalOpen(false)
            setNewStatus('')
          }
        }}
        variant="warning"
        title="Changer le statut ?"
        description="Sélectionnez le nouveau statut de l'expédition."
        confirmLabel="Confirmer le changement"
        cancelLabel="Annuler"
        onConfirm={handleUpdateStatus}
        loading={actionPending}
      >
        <div className="space-y-3 text-left">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">LTA</span>
            <span className="font-mono font-semibold">{shipment.ltaNumber}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Statut actuel</span>
            <span className="font-medium">{FREIGHT_STATUS_LABELS[shipment.status]}</span>
          </div>
          <Select
            label="Nouveau statut"
            options={statusOptions}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            placeholder="Sélectionner..."
            variant="filter"
            placement="top"
            className={freightStatusSelectClass(newStatus)}
          />
        </div>
      </ConfirmDialog>

      <FreightDeliveryPaymentModal
        open={deliveryPaymentModalOpen}
        onOpenChange={(open) => {
          if (!open && !actionPending) {
            setDeliveryPaymentModalOpen(false)
            setNewStatus('')
          }
        }}
        shipment={shipment}
        onConfirm={handleDeliveryPaymentConfirm}
        isLoading={actionPending}
      />

      <Modal
        open={!!editingPackage}
        onOpenChange={(open) => { if (!open) setEditingPackage(null) }}
        title={`Modifier le colis ${editingPackage?.packageNumber ?? ''}`}
      >
        {editingPackage && (
          <FreightPackageForm
            defaultValues={packageToFormDefaults(editingPackage)}
            onSubmit={handlePackageSubmit}
            isLoading={updatePackage.isPending}
            onCancel={() => setEditingPackage(null)}
          />
        )}
      </Modal>
    </div>
  )
}
