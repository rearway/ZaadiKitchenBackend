import twilio from 'twilio'

import {
  resetOtpSmsFallbackClaims,
  tryClaimOtpSmsFallback,
} from '../otpSmsFallbackGuard.js'
import {
  shouldTriggerWhatsAppOtpSmsFallback,
  validateTwilioRequestSignature,
} from '../twilioWebhookUtils.js'

describe('twilioWebhookUtils', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    resetOtpSmsFallbackClaims()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('shouldTriggerWhatsAppOtpSmsFallback', () => {
    it('returns false when fallback is disabled', () => {
      process.env.OTP_SMS_FALLBACK_ENABLED = 'false'
      expect(
        shouldTriggerWhatsAppOtpSmsFallback({
          messageStatus: 'failed',
          errorCode: '63005',
        })
      ).toBe(false)
    })

    it('returns true for 63005 when enabled', () => {
      process.env.OTP_SMS_FALLBACK_ENABLED = 'true'
      expect(
        shouldTriggerWhatsAppOtpSmsFallback({
          messageStatus: 'failed',
          errorCode: '63005',
        })
      ).toBe(true)
    })
  })

  describe('validateTwilioRequestSignature', () => {
    it('validates using twilio.validateRequest and configured callback URL', () => {
      process.env.TWILIO_STATUS_CALLBACK_URL =
        'https://api.example.com/api/v1/auth/webhooks/twilio/otp-status'
      const params = { MessageSid: 'SM123', MessageStatus: 'failed' }
      const signature = (twilio as typeof twilio & {
        getExpectedTwilioSignature: (
          authToken: string,
          url: string,
          params: Record<string, string>
        ) => string
      }).getExpectedTwilioSignature(
        'test_token',
        process.env.TWILIO_STATUS_CALLBACK_URL,
        params
      )
      expect(
        validateTwilioRequestSignature('test_token', signature, params)
      ).toBe(true)
      expect(validateTwilioRequestSignature('test_token', 'bad', params)).toBe(
        false
      )
    })
  })
})

describe('otpSmsFallbackGuard', () => {
  beforeEach(() => resetOtpSmsFallbackClaims())

  it('prevents double send for the same dedupe key', () => {
    expect(tryClaimOtpSmsFallback('callback:SM1', 60_000)).toBe(true)
    expect(tryClaimOtpSmsFallback('callback:SM1', 60_000)).toBe(false)
  })
})