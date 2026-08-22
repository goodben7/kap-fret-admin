import { z } from 'zod'
import { CASH_REGISTER_MODULE } from '@/constants/cash-register'

export const cashRegisterCreateSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  openingBalanceCDF: z.string().min(1, 'Solde d\'ouverture CDF requis'),
  openingBalanceUSD: z.string().min(1, 'Solde d\'ouverture USD requis'),
  active: z.boolean(),
  module: z.enum([
    CASH_REGISTER_MODULE.TICKETING,
    CASH_REGISTER_MODULE.FREIGHT,
    CASH_REGISTER_MODULE.GENERAL,
  ], { message: 'Module requis' }),
})

export const cashRegisterPatchSchema = z.object({
  code: z.string().min(2, 'Code requis'),
  name: z.string().min(2, 'Nom requis'),
  active: z.boolean(),
  module: z.enum([
    CASH_REGISTER_MODULE.TICKETING,
    CASH_REGISTER_MODULE.FREIGHT,
    CASH_REGISTER_MODULE.GENERAL,
  ], { message: 'Module requis' }),
})

export type CashRegisterCreateFormData = z.infer<typeof cashRegisterCreateSchema>
export type CashRegisterPatchFormData = z.infer<typeof cashRegisterPatchSchema>
