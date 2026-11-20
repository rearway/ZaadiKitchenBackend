import { buildDeps } from '../../../../__tests__/helpers/mock-deps.js'
import { makeUC } from '../HandleTwilioStatusCallback.js'
import twilio from 'twilio'

describe('HandleTwilioStatusCallback', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('rejects invalid signatures', async () => {
    process.env.TWILIO_STATUS_CALLBACK_URL =
      'https://api.example.com/api/v1/auth/webhooks/twilio/otp-status'
    process.env.OTP_SMS_FALLBACK_ENABLED = 'false'

    const deps = buildDeps({
      twilioAuthToken: 'test_token',
    })
    const handle = makeUC(deps)

    await expect(
      handle({
        signature: 'invalid',
        body: { MessageSid: 'SM1', MessageStatus: 'delivered' },
      })
    ).rejects.toMatchObject({ errorCode: 'AUTHENTICATION_ERROR' })
  })

  it('triggers SMS fallback on failed status with valid signature', async () => {
    process.env.TWILIO_STATUS_CALLBACK_URL =
      'https://api.example.com/api/v1/auth/webhooks/twilio/otp-status'
    process.env.OTP_SMS_FALLBACK_ENABLED = 'true'

    const body = {
      MessageSid: 'SM999',
      MessageStatus: 'failed',
      ErrorCode: '63005',
      ChannelToAddress: 'whatsapp:+918113871897',
    }
    const signature = twilio.getExpectedTwilioSignature(
      'twilio_test_auth_token',
      process.env.TWILIO_STATUS_CALLBACK_URL!,
      body
    )

    const sendSmsFallbackIfEnabled = jest.fn().mockResolvedValue(true)
    const deps = buildDeps({
      otpService: {
        sendOtp: jest.fn(),
        sendSmsFallbackIfEnabled,
      },
      otpSessionLoader: {
        getActiveSession: jest.fn().mockResolvedValue({
          id: 'sess-1',
          phone: '+918113871897',
          channel: 'whatsapp',
          code: '4321',
          expiresAt: new Date(Date.now() + 60_000),
          attemptCount: 0,
          isVerified: false,
          createdAt: new Date(),
        }),
        getRecentAttemptCount: jest.fn(),
        getLockedSession: jest.fn(),
      },
    })

    const handle = makeUC(deps)
    const result = await handle({ signature, body })
    expect(result).toEqual({ ok: true })
    expect(sendSmsFallbackIfEnabled).toHaveBeenCalledWith(
      '+918113871897',
      '4321',
      'callback:SM999'
    )
  })
})