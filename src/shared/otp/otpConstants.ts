export const OTP_EXPIRY_SECONDS = 120

export type OtpChannel = 'sms' | 'whatsapp'

export function normalizeOtpChannel(channel: string): OtpChannel {
  return channel === 'sms' ? 'sms' : 'whatsapp'
}

/** Testing only: return the OTP in the send response even when it is really delivered. */
export function isOtpCodeInResponseEnabled(): boolean {
  return process.env.OTP_RETURN_CODE_IN_RESPONSE === 'true'
}

export function isTwilioWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  )
}
