import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { normalizeCurrency, type Currency } from '@/constants/ticket'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return formatMoney(amount, 'USD')
}

export function formatMoney(amount: number, currency?: Currency | string | null): string {
  const code = normalizeCurrency(currency)
  const safeAmount = Number.isFinite(amount) ? amount : 0

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: code === 'USD' ? 2 : 0,
      maximumFractionDigits: code === 'USD' ? 2 : 0,
    }).format(safeAmount)
  } catch {
    return `${safeAmount.toLocaleString('fr-FR')} ${code}`
  }
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}
