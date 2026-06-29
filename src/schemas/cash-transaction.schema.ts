import { z } from 'zod'
import {
  CASH_TRANSACTION_REFERENCE_TYPE,
  CASH_TRANSACTION_TYPE,
} from '@/constants/cash-transaction'

export const cashTransactionCreateSchema = z
  .object({
    cashRegister: z.string().min(1, 'Caisse requise'),
    type: z.enum([CASH_TRANSACTION_TYPE.ENTRY, CASH_TRANSACTION_TYPE.EXIT], {
      message: 'Type requis',
    }),
    amount: z.string().min(1, 'Montant requis'),
    currency: z.string().min(1, 'Devise requise'),
    description: z.string().min(1, 'Description requise'),
    referenceType: z.enum([
      CASH_TRANSACTION_REFERENCE_TYPE.TICKET,
      CASH_TRANSACTION_REFERENCE_TYPE.CHECKIN,
      CASH_TRANSACTION_REFERENCE_TYPE.FREIGHT,
      CASH_TRANSACTION_REFERENCE_TYPE.MANUAL,
    ]),
    referenceId: z.string().optional(),
    transactionDate: z.string().min(1, 'Date requise'),
    transactionTime: z.string().min(1, 'Heure requise'),
    validated: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.referenceType !== CASH_TRANSACTION_REFERENCE_TYPE.MANUAL && !data.referenceId?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['referenceId'], message: 'Référence requise' })
    }
  })

export type CashTransactionCreateFormData = z.infer<typeof cashTransactionCreateSchema>
