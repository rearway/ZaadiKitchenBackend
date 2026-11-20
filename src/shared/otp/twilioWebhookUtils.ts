import twilio from 'twilio'

import {
  getTwilioStatusCallbackValidationUrl,
  isOtpSmsFallbackEnabled,
} from './twilioOtpConfig.js'

/** @see Twilio WhatsApp / channel errors that often warrant SMS fallback (external knowledge). */
export const WHATSAPP_OTP_SMS_FALLBACK_ERROR_CODES = new Set([
  '63005',
  '63016',
  '63024',
  '63007',
  '63049',
  '21610',
])

export function maskPhoneForLog(phone: string | undefined | null): string {
  if (!phone) return '(none)'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `***${digits.slice(-4)}`
}

export function maskOtpInText(text: string | undefined | null): string {
  if (!text) return ''
  return text.replace(/\b\d{4}\b/g, '****')
}

export function validateTwilioRequestSignature(
  authToken: string,
  signature: string | undefined,
  params: Record<string, string>
): boolean {
  if (!signature?.trim()) return false
  const url = getTwilioStatusCallbackValidationUrl()
  if (!url) return false
  return twilio.validateRequest(authToken, signature, url, params)
}

export function parseWhatsAppE164FromTwilioAddress(
  address: string | undefined | null
): string | null {
  if (!address) return null
  const trimmed = address.trim()
  const e164 = trimmed.replace(/^whatsapp:/i, '')
  if (!/^\+\d{8,15}$/.test(e164)) return null
  return e164
}

export function shouldTriggerWhatsAppOtpSmsFallback(input: {
  messageStatus?: string | null
  errorCode?: string | null
}): boolean {
  if (!isOtpSmsFallbackEnabled()) return false
  const code = input.errorCode?.toString().trim()
  if (code && WHATSAPP_OTP_SMS_FALLBACK_ERROR_CODES.has(code)) return true
  const status = input.messageStatus?.toLowerCase().trim()
  return status === 'failed' || status === 'undelivered'
}

export type TwilioStatusCallbackFields = {
  MessageSid?: string
  MessageStatus?: string
  ErrorCode?: string
  ErrorMessage?: string
  ChannelStatusMessage?: string
  ChannelStatusCode?: string
  ChannelToAddress?: string
  To?: string
  From?: string
}

export function pickTwilioStatusCallbackFields(
  body: Record<string, string>
): TwilioStatusCallbackFields {
  return {
    MessageSid: body.MessageSid,
    MessageStatus: body.MessageStatus,
    ErrorCode: body.ErrorCode,
    ErrorMessage: body.ErrorMessage,
    ChannelStatusMessage: body.ChannelStatusMessage,
    ChannelStatusCode: body.ChannelStatusCode,
    ChannelToAddress: body.ChannelToAddress,
    To: body.To,
    From: body.From,
  }
}