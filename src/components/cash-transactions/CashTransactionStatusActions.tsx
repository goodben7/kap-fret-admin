import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { CheckCircle2, Clock3, MoreHorizontal, Search, XCircle } from 'lucide-react'
import { ConfirmDialog, type ConfirmDialogVariant } from '@/components/ui/confirm-dialog'
import { Button } from '@/components/ui/button'
import { CashTransactionStatusBadge } from '@/components/cash-transactions/CashTransactionStatusBadge'
import { CASH_TRANSACTION_STATUS, type CashTransactionStatus } from '@/constants/cash-transaction'
import { useChangeCashTransactionStatus } from '@/hooks/useCashTransactions'
import {
  canChangeCashTransactionStatus,
  getAvailableCashTransactionStatusActions,
  getCashTransactionStatus,
  getCashTransactionStatusLabel,
} from '@/lib/cash-transaction'
import { cn } from '@/lib/utils'
import type { CashTransaction } from '@/types/cash-transaction'

const ACTION_META: Record<
  CashTransactionStatus,
  {
    label: string
    description: string
    icon: typeof CheckCircle2
    iconClass: string
    variant: ConfirmDialogVariant
  }
> = {
  [CASH_TRANSACTION_STATUS.PENDING]: {
    label: 'Remettre en attente',
    description: 'Retour au statut initial',
    icon: Clock3,
    iconClass: 'text-muted-foreground',
    variant: 'default',
  },
  [CASH_TRANSACTION_STATUS.IN_REVIEW]: {
    label: 'Mettre en examen',
    description: 'Signaler pour revue',
    icon: Search,
    iconClass: 'text-amber-600',
    variant: 'warning',
  },
  [CASH_TRANSACTION_STATUS.VALIDATED]: {
    label: 'Valider',
    description: 'Approuver la transaction',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    variant: 'success',
  },
  [CASH_TRANSACTION_STATUS.REJECTED]: {
    label: 'Rejeter',
    description: 'Refuser la transaction',
    icon: XCircle,
    iconClass: 'text-destructive',
    variant: 'destructive',
  },
}

const menuItemClass =
  'flex w-full cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2 text-left outline-none transition-colors data-[highlighted]:bg-muted/70 data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

type Layout = 'menu' | 'buttons'

interface CashTransactionStatusActionsProps {
  transaction: Pick<CashTransaction, 'id' | 'status' | 'validated'>
  /** `menu` = badge + dropdown (tableau) · `buttons` = boutons libellés (carte / détail) */
  layout?: Layout
  className?: string
}

export function CashTransactionStatusActions({
  transaction,
  layout = 'menu',
  className,
}: CashTransactionStatusActionsProps) {
  const changeStatus = useChangeCashTransactionStatus()
  const [pendingStatus, setPendingStatus] = useState<CashTransactionStatus | null>(null)

  const currentStatus = getCashTransactionStatus(transaction)
  const actions = canChangeCashTransactionStatus(transaction)
    ? getAvailableCashTransactionStatusActions(currentStatus)
    : []
  const confirmMeta = pendingStatus ? ACTION_META[pendingStatus] : null

  const handleConfirm = async () => {
    if (!pendingStatus) return
    await changeStatus.mutateAsync({ id: transaction.id, status: pendingStatus })
    setPendingStatus(null)
  }

  const dialog = (
    <ConfirmDialog
      open={pendingStatus != null}
      onOpenChange={(open) => {
        if (!open && !changeStatus.isPending) setPendingStatus(null)
      }}
      variant={confirmMeta?.variant ?? 'default'}
      title={`${confirmMeta?.label ?? 'Changer le statut'} ?`}
      description={
        pendingStatus
          ? `La transaction passera au statut « ${getCashTransactionStatusLabel(pendingStatus)} ».`
          : undefined
      }
      confirmLabel={confirmMeta?.label ?? 'Confirmer'}
      cancelLabel="Annuler"
      onConfirm={handleConfirm}
      loading={changeStatus.isPending}
    />
  )

  if (layout === 'buttons') {
    if (actions.length === 0) return null

    return (
      <>
        <div
          className={cn('grid grid-cols-1 gap-2 sm:grid-cols-3', className)}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((status) => {
            const meta = ACTION_META[status]
            const Icon = meta.icon
            return (
              <Button
                key={status}
                type="button"
                variant="outline"
                className="h-11 justify-start gap-2 rounded-xl px-3"
                disabled={changeStatus.isPending}
                onClick={() => setPendingStatus(status)}
              >
                <Icon className={cn('h-4 w-4 shrink-0', meta.iconClass)} aria-hidden="true" />
                <span className="text-sm font-medium">{meta.label}</span>
              </Button>
            )
          })}
        </div>
        {dialog}
      </>
    )
  }

  return (
    <>
      <div
        className={cn('inline-flex items-center gap-1.5', className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <CashTransactionStatusBadge transaction={transaction} />

        {actions.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                disabled={changeStatus.isPending}
                aria-label="Changer le statut"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className={cn(
                  'z-50 w-56 rounded-2xl border border-border/80 bg-popover p-1.5 shadow-lg',
                  'data-[state=open]:animate-in data-[state=closed]:animate-out',
                  'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                  'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                )}
              >
                <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Changer le statut
                </DropdownMenu.Label>
                {actions.map((status) => {
                  const meta = ACTION_META[status]
                  const Icon = meta.icon
                  return (
                    <DropdownMenu.Item
                      key={status}
                      className={menuItemClass}
                      disabled={changeStatus.isPending}
                      onSelect={() => setPendingStatus(status)}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60',
                          meta.iconClass,
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{meta.label}</span>
                        <span className="block text-xs text-muted-foreground">{meta.description}</span>
                      </span>
                    </DropdownMenu.Item>
                  )
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>
      {dialog}
    </>
  )
}
