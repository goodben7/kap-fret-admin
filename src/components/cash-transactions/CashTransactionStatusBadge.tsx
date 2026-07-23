import { Badge } from '@/components/ui/badge'
import {
  cashTransactionStatusBadgeVariant,
  getCashTransactionStatus,
  getCashTransactionStatusLabel,
} from '@/lib/cash-transaction'
import type { CashTransaction } from '@/types/cash-transaction'

export function CashTransactionStatusBadge({
  transaction,
}: {
  transaction: Pick<CashTransaction, 'status' | 'validated'>
}) {
  const status = getCashTransactionStatus(transaction)
  return (
    <Badge variant={cashTransactionStatusBadgeVariant(status)}>
      {getCashTransactionStatusLabel(status)}
    </Badge>
  )
}
