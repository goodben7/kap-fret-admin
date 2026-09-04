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
    const amount = parseFloat(data.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Montant invalide' })
    }
  })

export type CashTransactionCreateFormData = z.infer<typeof cashTransactionCreateSchema>

export const cashTransactionTransferSchema = z
  .object({
    sourceCashRegister: z.string().min(1, 'Caisse source requise'),
    destinationCashRegister: z.string().min(1, 'Caisse destination requise'),
    amount: z.string().min(1, 'Montant requis'),
    currency: z.string().min(1, 'Devise requise'),
    description: z.string().optional(),
    transactionDate: z.string().min(1, 'Date requise'),
    transactionTime: z.string().min(1, 'Heure requise'),
    validated: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.sourceCashRegister
      && data.destinationCashRegister
      && data.sourceCashRegister === data.destinationCashRegister
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['destinationCashRegister'],
        message: 'La caisse destination doit être différente de la source',
      })
    }
    const amount = parseFloat(data.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Montant invalide' })
    }
  })

export type CashTransactionTransferFormData = z.infer<typeof cashTransactionTransferSchema>

/** Modification d'un mouvement manuel (ENTRY/EXIT) non validé. */
export const cashTransactionPatchSchema = z
  .object({
    cashRegister: z.string().min(1, 'Caisse requise'),
    type: z.enum([CASH_TRANSACTION_TYPE.ENTRY, CASH_TRANSACTION_TYPE.EXIT], {
      message: 'Type requis',
    }),
    amount: z.string().min(1, 'Montant requis'),
    currency: z.string().min(1, 'Devise requise'),
    description: z.string().min(1, 'Description requise'),
    transactionDate: z.string().min(1, 'Date requise'),
    transactionTime: z.string().min(1, 'Heure requise'),
  })
  .superRefine((data, ctx) => {
    const amount = parseFloat(data.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Montant invalide' })
    }
  })

export type CashTransactionPatchFormData = z.infer<typeof cashTransactionPatchSchema>

export const cashTransactionConversionSchema = z
  .object({
    cashRegister: z.string().min(1, 'Caisse requise'),
    fromCurrency: z.string().min(1, 'Devise source requise'),
    toCurrency: z.string().min(1, 'Devise cible requise'),
    amount: z.string().min(1, 'Montant requis'),
    exchangeRate: z.string().min(1, 'Taux de change requis'),
    description: z.string().optional(),
    transactionDate: z.string().min(1, 'Date requise'),
    transactionTime: z.string().min(1, 'Heure requise'),
    validated: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.fromCurrency && data.toCurrency && data.fromCurrency === data.toCurrency) {
      ctx.addIssue({
        code: 'custom',
        path: ['toCurrency'],
        message: 'La devise cible doit être différente de la source',
      })
    }
    const amount = parseFloat(data.amount.replace(',', '.'))
    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Montant invalide' })
    }
    const rate = parseFloat(data.exchangeRate.replace(',', '.'))
    if (!Number.isFinite(rate) || rate <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['exchangeRate'],
        message: 'Taux invalide (1 USD = N CDF)',
      })
    }
  })

export type CashTransactionConversionFormData = z.infer<typeof cashTransactionConversionSchema>
