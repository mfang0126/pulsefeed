import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str
  return str.slice(0, len) + '...'
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function sentimentEmoji(sentiment: string | null): string {
  switch (sentiment) {
    case 'positive': return '🟢'
    case 'negative': return '🔴'
    case 'neutral': return '⚪'
    default: return '⚪'
  }
}

export function importanceColor(importance: number): string {
  if (importance >= 80) return 'text-red-500'
  if (importance >= 60) return 'text-orange-500'
  if (importance >= 40) return 'text-yellow-500'
  return 'text-gray-400'
}
