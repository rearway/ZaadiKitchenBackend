import { makeUC } from '../SendOtp'
import { buildDeps, makeOtpSession } from '../../../../__tests__/helpers/mock-deps'

describe('SendOtp', () => {
  const validPhone = '+966512345678'

  it('sends OTP for a valid Saudi phone number', async () => {
    const deps = buildDeps()
    const sendOtp = makeUC(deps)

    const result = await sendOtp({ phone: validPhone, channel: 'whatsapp' })

    expect(result.message).toBe('OTP sent successfully')
    expect(result.data.phone).toBe(validPhone)
    expect(result.data.channel).toBe('whatsapp')
    expect(result.data.expiresInSeconds).toBe(120)
    expect(result.data.otpCode).toMatch(/^\d{4}$/)
  })

  it('creates an OTP session in the database', async () => {
    const deps = buildDeps()
    const sendOtp = makeUC(deps)

    await sendOtp({ phone: validPhone, channel: 'sms' })

    expect(deps.otpSessionPersistor.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: validPhone,
        channel: 'sms',
        code: expect.stringMatching(/^\d{4}$/),
        expiresAt: expect.any(Date),
      })
    )
  })

  it('calls the OTP notification service', async () => {
    const deps = buildDeps()
    const sendOtp = makeUC(deps)

    await sendOtp({ phone: validPhone, channel: 'whatsapp' })

    expect(deps.otpService.sendOtp).toHaveBeenCalledWith(
      validPhone,
      expect.stringMatching(/^\d{4}$/),
      'whatsapp'
    )
  })

  describe('WhatsApp without SKIP_OTP', () => {
    const envBackup = { ...process.env }

    afterEach(() => {
      process.env = { ...envBackup }
    })

    it('rejects WhatsApp when Twilio WhatsApp is not configured', async () => {
      delete process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_AUTH_TOKEN
      delete process.env.TWILIO_WHATSAPP_FROM
      const deps = buildDeps({ skipOtp: false })
      const sendOtp = makeUC(deps)

      await expect(
        sendOtp({ phone: validPhone, channel: 'whatsapp' })
      ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })
      expect(deps.otpSessionPersistor.createSession).not.toHaveBeenCalled()
    })

    it('stores a 4-digit code and sends via WhatsApp when configured', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC123'
      process.env.TWILIO_AUTH_TOKEN = 'token'
      process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+14155238886'
      const deps = buildDeps({ skipOtp: false })
      const sendOtp = makeUC(deps)

      const result = await sendOtp({ phone: validPhone, channel: 'whatsapp' })

      expect(result.data.otpCode).toBeUndefined()
      expect(deps.otpSessionPersistor.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'whatsapp',
          code: expect.stringMatching(/^\d{4}$/),
        })
      )
      expect(deps.otpService.sendOtp).toHaveBeenCalledWith(
        validPhone,
        expect.stringMatching(/^\d{4}$/),
        'whatsapp'
      )
    })
  })

  it('still succeeds when the OTP notification service throws (graceful degradation)', async () => {
    const deps = buildDeps({
      otpService: { sendOtp: jest.fn().mockRejectedValue(new Error('WhatsApp service down')) },
    })
    const sendOtp = makeUC(deps)

    const result = await sendOtp({ phone: validPhone, channel: 'whatsapp' })

    expect(result.message).toBe('OTP sent successfully')
    expect(result.data.otpCode).toMatch(/^\d{4}$/)
    expect(deps.logger.error).toHaveBeenCalled()
  })

  it('throws RateLimitError when the phone is actively locked', async () => {
    const lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
    const deps = buildDeps({
      otpSessionLoader: {
        ...buildDeps().otpSessionLoader,
        getLockedSession: jest.fn().mockResolvedValue(makeOtpSession({ lockedUntil })),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
    })
    const sendOtp = makeUC(deps)

    await expect(sendOtp({ phone: validPhone, channel: 'whatsapp' })).rejects.toMatchObject({
      errorCode: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    })
    expect(deps.otpSessionPersistor.createSession).not.toHaveBeenCalled()
  })

  it('does not treat an expired lock as active', async () => {
    const expiredLockUntil = new Date(Date.now() - 1000)
    const deps = buildDeps({
      otpSessionLoader: {
        ...buildDeps().otpSessionLoader,
        getLockedSession: jest.fn().mockResolvedValue(makeOtpSession({ lockedUntil: expiredLockUntil })),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
    })
    const sendOtp = makeUC(deps)

    const result = await sendOtp({ phone: validPhone, channel: 'whatsapp' })
    expect(result.message).toBe('OTP sent successfully')
  })

  it('throws RateLimitError and locks the phone when 3 requests in window have been made', async () => {
    const deps = buildDeps({
      otpSessionLoader: {
        ...buildDeps().otpSessionLoader,
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(3),
      },
    })
    const sendOtp = makeUC(deps)

    await expect(sendOtp({ phone: validPhone, channel: 'whatsapp' })).rejects.toMatchObject({
      errorCode: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
    })

    expect(deps.otpSessionPersistor.lockPhone).toHaveBeenCalledWith(
      validPhone,
      expect.any(Date)
    )
    expect(deps.otpSessionPersistor.createSession).not.toHaveBeenCalled()
  })

  it('allows exactly 2 recent attempts without locking', async () => {
    const deps = buildDeps({
      otpSessionLoader: {
        ...buildDeps().otpSessionLoader,
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(2),
      },
    })
    const sendOtp = makeUC(deps)

    const result = await sendOtp({ phone: validPhone, channel: 'whatsapp' })
    expect(result.message).toBe('OTP sent successfully')
    expect(deps.otpSessionPersistor.lockPhone).not.toHaveBeenCalled()
  })

  describe('Indian test phones', () => {
    const envBackup = { ...process.env }

    afterEach(() => {
      process.env = { ...envBackup }
    })

    it('accepts +91 when OTP_ALLOW_INDIAN_PHONES=true', async () => {
      process.env.OTP_ALLOW_INDIAN_PHONES = 'true'
      const deps = buildDeps()
      const sendOtp = makeUC(deps)

      const result = await sendOtp({
        phone: '+919876543210',
        channel: 'whatsapp',
      })

      expect(result.data.phone).toBe('+919876543210')
    })

    it('rejects +91 when OTP_ALLOW_INDIAN_PHONES=false', async () => {
      process.env.OTP_ALLOW_INDIAN_PHONES = 'false'
      const deps = buildDeps()
      const sendOtp = makeUC(deps)

      await expect(
        sendOtp({ phone: '+919876543210', channel: 'sms' })
      ).rejects.toMatchObject({
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      })
    })
  })

  describe('Play Store review accounts', () => {
    const envBackup = { ...process.env }

    afterEach(() => {
      process.env = { ...envBackup }
    })

    it('uses a fixed OTP code for configured review phones', async () => {
      process.env.OTP_REVIEW_ENABLED = 'true'
      process.env.OTP_REVIEW_ACCOUNTS = '+966500000101:1234'

      const deps = buildDeps()
      const sendOtp = makeUC(deps)

      const result = await sendOtp({ phone: '+966500000101', channel: 'sms' })

      expect(result.data.otpCode).toBe('1234')
      expect(deps.otpSessionPersistor.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+966500000101', code: '1234' })
      )
    })
  })
})
