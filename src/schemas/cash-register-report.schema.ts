import { z } from 'zod'

export const cashRegisterReportSchema = z
  .object({
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().min(1, 'Date de fin requise'),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'La date de fin doit être postérieure ou égale à la date de début',
        path: ['endDate'],
      })
    }
  })

export type CashRegisterReportFormData = z.infer<typeof cashRegisterReportSchema>
