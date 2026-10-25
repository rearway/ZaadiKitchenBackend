import type { PaymentMethodType } from '../entities/PaymentMethod.js'

function last4FromRecord(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  for (const key of ['last_four', 'last4', 'lastFour']) {
    const raw = record[key]
    if (typeof raw === 'string' && /^\d{4}$/.test(raw)) return raw
    if (
      typeof raw === 'number' &&
      Number.isInteger(raw) &&
      raw >= 0 &&
      raw <= 9999
    ) {
      return String(raw).padStart(4, '0')
    }
  }
  if (typeof record.number === 'string') {
    const masked = record.number.match(/(\d{4})\s*$/)
    if (masked && /[Xx*•]/.test(record.number)) return masked[1]
  }
  if (record.source) return last4FromRecord(record.source)
  return null
}

/** Last four digits from a Moyasar token id or a stored source payload, when present. */
export function extractCardLast4(token: string): string | null {
  const trimmed = token.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      const fromJson = last4FromRecord(parsed)
      if (fromJson) return fromJson
    } catch {
      // Token is not JSON; fall through to textual patterns.
    }
  }

  const explicit = trimmed.match(/(?:last[_-]?four|last4)\D*(\d{4})\b/i)
  if (explicit) return explicit[1]

  const masked = trimmed.match(/(?:[Xx*•]{2,}[\s-]*)+(\d{4})\b/)
  if (masked) return masked[1]

  const suffixed = trimmed.match(/[:|#](\d{4})$/)
  if (suffixed) return suffixed[1]

  return null
}

export function buildPaymentMethodLabel(
  type: PaymentMethodType,
  token: string
): string {
  const last4 = extractCardLast4(token)
  switch (type) {
    case 'mada':
      return last4 ? `Mada ····${last4}` : 'Mada'
    case 'visa':
      return last4 ? `Visa ····${last4}` : 'Visa'
    case 'mastercard':
      return last4 ? `Mastercard ····${last4}` : 'Mastercard'
    case 'stc_pay':
      return 'STC Pay'
    case 'apple_pay':
      return 'Apple Pay'
    default:
      return type
  }
}
