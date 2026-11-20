export type TwilioWhatsAppOtpCreateParams = {
  from: string
  to: string
  contentSid: string
  contentVariables: string
  statusCallback?: string
}

const FOUR_DIGIT_OTP = /^\d{4}$/

export function assertFourDigitOtpCode(code: string): void {
  if (!FOUR_DIGIT_OTP.test(code)) {
    throw new Error('OTP code must be exactly 4 digits (string, no padding or prefix)')
  }
}

/** E.164 only, e.g. +966500191761 — no spaces, no leading 0, no whatsapp: prefix. */
export function normalizeE164Phone(phone: string): string {
  const trimmed = phone.trim()
  const withoutChannel = trimmed.replace(/^whatsapp:/i, '')
  if (!/^\+\d{8,15}$/.test(withoutChannel)) {
    throw new Error('Phone must be E.164 (e.g. +966512345678)')
  }
  return withoutChannel
}

export function formatWhatsAppAddress(e164Phone: string): string {
  const e164 = normalizeE164Phone(e164Phone)
  return `whatsapp:${e164}`
}

export function formatWhatsAppFrom(from: string): string {
  const trimmed = from.trim()
  return trimmed.startsWith('whatsapp:')
    ? trimmed
    : formatWhatsAppAddress(trimmed)
}

/**
 * Meta authentication templates: single variable "1", plain OTP string, JSON string for Twilio.
 */
export function buildWhatsAppOtpContentVariables(code: string): string {
  assertFourDigitOtpCode(code)
  if (code.length > 15) {
    throw new Error('OTP variable exceeds 15 characters')
  }
  return JSON.stringify({ '1': code })
}

export function buildTwilioWhatsAppOtpCreateParams(input: {
  from: string
  phoneE164: string
  code: string
  contentSid: string
  statusCallbackUrl?: string | null
}): TwilioWhatsAppOtpCreateParams {
  const from = formatWhatsAppFrom(input.from)
  const to = formatWhatsAppAddress(input.phoneE164)
  const contentVariables = buildWhatsAppOtpContentVariables(input.code)
  const contentSid = input.contentSid.trim()

  const params: TwilioWhatsAppOtpCreateParams = {
    from,
    to,
    contentSid,
    contentVariables,
  }

  const callback = input.statusCallbackUrl?.trim()
  if (callback) {
    params.statusCallback = callback
  }

  return params
}