export const OTP_EXPIRY_SECONDS = 120

export type OtpChannel = 'sms' | 'whatsapp'

export function normalizeOtpChannel(channel: string): OtpChannel {
  return channel === 'sms' ? 'sms' : 'whatsapp'
}

export function isTwilioWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  )
}
