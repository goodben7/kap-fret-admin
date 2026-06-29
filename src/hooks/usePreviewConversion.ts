import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cashTransactionService } from '@/services/cash-transaction.service'

export const previewConversionKeys = {
  all: ['previewConversion'] as const,
  preview: (cashRegister: string, amount: string, currencyIri: string) =>
    [...previewConversionKeys.all, cashRegister, amount, currencyIri] as const,
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function usePreviewConversion(params: {
  cashRegister?: string
  amount: string
  currencyIri?: string
  enabled?: boolean
}) {
  const debouncedAmount = useDebouncedValue(params.amount, 400)
  const canFetch =
    params.enabled !== false
    && !!params.cashRegister?.trim()
    && !!params.currencyIri?.trim()
    && (parseFloat(debouncedAmount) || 0) > 0

  return useQuery({
    queryKey: previewConversionKeys.preview(
      params.cashRegister ?? '',
      debouncedAmount,
      params.currencyIri ?? '',
    ),
    queryFn: () =>
      cashTransactionService.previewConversion({
        cashRegister: params.cashRegister!,
        amount: debouncedAmount,
        currency: params.currencyIri!,
      }),
    enabled: canFetch,
    staleTime: 30_000,
  })
}
