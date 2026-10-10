/**
 * Fixed OTP for Play Store / QA review accounts.
 *
 * Enable with OTP_REVIEW_ENABLED=true and OTP_REVIEW_ACCOUNTS=phone:code,phone:code
 * Example: +966500000101:1234,+966500000102:1234
 */

export interface ReviewOtpAccount {
  phone: string
  code: string
}

const ISO_PHONE = /^\+[1-9]\d{7,14}$/

export function normalizePhone(phone: string): string {
  return phone.trim().replace(/\s+/g, '')
}

export function isReviewOtpEnabled(): boolean {
  return process.env.OTP_REVIEW_ENABLED === 'true'
}

export function parseReviewOtpAccounts(raw: string | undefined): ReviewOtpAccount[] {
  if (!raw?.trim()) return []

  const accounts: ReviewOtpAccount[] = []
  for (const part of raw.split(',')) {
    const segment = part.trim()
    if (!segment) continue

    const colonIndex = segment.lastIndexOf(':')
    if (colonIndex <= 0) continue

    const phone = normalizePhone(segment.slice(0, colonIndex))
    const code = segment.slice(colonIndex + 1).trim()
    if (!ISO_PHONE.test(phone) || !/^\d{4}$/.test(code)) continue

    accounts.push({ phone, code })
  }
  return accounts
}

export function getReviewOtpAccounts(): ReviewOtpAccount[] {
  if (!isReviewOtpEnabled()) return []
  return parseReviewOtpAccounts(process.env.OTP_REVIEW_ACCOUNTS)
}

export function getReviewOtpCode(phone: string): string | null {
  const normalized = normalizePhone(phone)
  const match = getReviewOtpAccounts().find(a => a.phone === normalized)
  return match?.code ?? null
}

export function isReviewPhone(phone: string): boolean {
  return getReviewOtpCode(phone) !== null
}
