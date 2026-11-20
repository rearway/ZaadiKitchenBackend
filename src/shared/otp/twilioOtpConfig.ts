export function isOtpSmsFallbackEnabled(): boolean {
  return process.env.OTP_SMS_FALLBACK_ENABLED === 'true'
}

export function getTwilioStatusCallbackUrl(): string | null {
  const url = process.env.TWILIO_STATUS_CALLBACK_URL?.trim()
  return url || null
}

export function isTwilioSmsFallbackConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_SMS_FROM?.trim() ||
      process.env.TWILIO_SMS_MESSAGING_SERVICE_SID?.trim()
  )
}

export function getTwilioSmsFallbackFrom(): string | null {
  return process.env.TWILIO_SMS_FROM?.trim() || null
}

export function getTwilioSmsMessagingServiceSid(): string | null {
  return process.env.TWILIO_SMS_MESSAGING_SERVICE_SID?.trim() || null
}

/** Twilio must validate against this exact public URL (set equal to TWILIO_STATUS_CALLBACK_URL). */
export function getTwilioStatusCallbackValidationUrl(): string | null {
  return getTwilioStatusCallbackUrl()
}