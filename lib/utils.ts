import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function getMonthYear(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function parseAmount(raw: string): number {
  // Handle European formats: 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})*(,\d{2})?$/.test(raw.trim())) {
    return parseFloat(raw.replace(/\./g, '').replace(',', '.'))
  }
  // Handle US formats: 1,234.56 → 1234.56
  return parseFloat(raw.replace(/,/g, ''))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const CURRENCIES = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
]

export const ACCOUNT_COLORS = [
  '#1E4C8A', // accent blue
  '#A3262A', // red
  '#2B6440', // green
  '#7A4E00', // ochre
  '#6B3F8F', // plum
  '#4A5562', // slate
  '#151B24', // ink
  '#4B78B4', // mid blue
  '#263A57', // navy
  '#5B6B80', // grey blue
]
