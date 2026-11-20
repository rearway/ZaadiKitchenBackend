import { ConfigService } from '@nestjs/config'

import { resetOtpSmsFallbackClaims } from '../../../shared/otp/otpSmsFallbackGuard.js'
import { RoutingOtpService } from '../routing-otp.service.js'
import type { TwilioWhatsAppOtpService } from '../twilio-whatsapp-otp.service.js'
import type { SnsOtpService } from '../sns-otp.service.js'

describe('RoutingOtpService SMS fallback', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    resetOtpSmsFallbackClaims()
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function buildRouting(
    whatsapp: Pick<TwilioWhatsAppOtpService, 'sendOtp'>,
    sns: Pick<SnsOtpService, 'sendOtp'>
  ) {
    const config = new ConfigService({
      TWILIO_ACCOUNT_SID: 'ACtest',
      TWILIO_AUTH_TOKEN: 'token',
    })
    return new RoutingOtpService(sns as SnsOtpService, whatsapp as TwilioWhatsAppOtpService, config)
  }

  it('falls back to SMS once when WhatsApp throws and fallback is enabled', async () => {
    process.env.OTP_SMS_FALLBACK_ENABLED = 'true'
    const whatsapp = { sendOtp: jest.fn().mockRejectedValue(new Error('63005')) }
    const sns = { sendOtp: jest.fn().mockResolvedValue(undefined) }
    const routing = buildRouting(whatsapp, sns)

    await routing.sendOtp('+966500191761', '5678', 'whatsapp')

    expect(whatsapp.sendOtp).toHaveBeenCalledTimes(1)
    expect(sns.sendOtp).toHaveBeenCalledTimes(1)
    expect(sns.sendOtp).toHaveBeenCalledWith('+966500191761', '5678', 'sms')
  })

  it('does not invoke fallback twice for the same code', async () => {
    process.env.OTP_SMS_FALLBACK_ENABLED = 'true'
    const whatsapp = { sendOtp: jest.fn().mockRejectedValue(new Error('fail')) }
    const sns = { sendOtp: jest.fn().mockResolvedValue(undefined) }
    const routing = buildRouting(whatsapp, sns)

    const ok = await routing.sendSmsFallbackIfEnabled(
      '+966500191761',
      '5678',
      'immediate:+966500191761:5678'
    )
    const again = await routing.sendSmsFallbackIfEnabled(
      '+966500191761',
      '5678',
      'immediate:+966500191761:5678'
    )

    expect(ok).toBe(true)
    expect(again).toBe(false)
  })
})