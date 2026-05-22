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
      expect.stringMatching(/^\d{4}$/)
    )
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

  it.each([
    '+9665123456',       // too short (8 digits)
    '+96651234567890',   // too long (11 digits)
    '+971512345678',     // wrong country code (UAE)
    '0512345678',        // no country code
    '+966 512 345 678',  // contains spaces
    '966512345678',      // missing leading +
  ])('throws ValidationError for invalid phone: %s', async (invalidPhone) => {
    const deps = buildDeps()
    const sendOtp = makeUC(deps)

    await expect(sendOtp({ phone: invalidPhone, channel: 'whatsapp' })).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
    })
    expect(deps.otpSessionPersistor.createSession).not.toHaveBeenCalled()
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
})
