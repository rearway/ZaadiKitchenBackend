import * as jwt from 'jsonwebtoken'
import { makeUC } from '../VerifyOtp'
import {
  buildDeps,
  makeUser,
  makeOtpSession,
  makeRefreshToken,
} from '../../../../__tests__/helpers/mock-deps'

describe('VerifyOtp', () => {
  const validInput = {
    phone: '+966512345678',
    code: '1234',
    userAgent: 'TestApp/1.0',
    ipAddress: '127.0.0.1',
  }

  function makeDepsWithActiveSession(sessionOverrides = {}, userOverride: ReturnType<typeof makeUser> | null = null) {
    return buildDeps({
      otpSessionLoader: {
        getActiveSession: jest.fn().mockResolvedValue(makeOtpSession(sessionOverrides)),
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(userOverride),
        getUserByPhone: jest.fn().mockResolvedValue(userOverride),
        getUserByEmail: jest.fn().mockResolvedValue(userOverride),
      },
    })
  }

  it('returns tokens and user data for a valid OTP code', async () => {
    const existingUser = makeUser({ fullName: 'Ahmed Al-Rashidi' })
    const deps = makeDepsWithActiveSession({}, existingUser)
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    expect(result.data.isNewUser).toBe(false)
    expect(result.data.tokenType).toBe('Bearer')
    expect(result.data.accessToken).toBeTruthy()
    expect(result.data.refreshToken).toBeTruthy()
    expect(result.data.user.phone).toBe('+966512345678')
    expect((result.data.user as any).password).toBeUndefined()
  })

  it('creates a new CUSTOMER user when the phone number is unrecognised', async () => {
    const newUser = makeUser({ fullName: 'New User' })
    const deps = buildDeps({
      otpSessionLoader: {
        getActiveSession: jest.fn().mockResolvedValue(makeOtpSession()),
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(null),
        getUserByPhone: jest.fn().mockResolvedValue(null),
        getUserByEmail: jest.fn().mockResolvedValue(null),
      },
      userPersistor: {
        createUser: jest.fn().mockResolvedValue(newUser),
        updateUser: jest.fn().mockResolvedValue(newUser),
      },
    })
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    expect(result.data.isNewUser).toBe(true)
    expect(deps.userPersistor.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+966512345678', role: 'CUSTOMER' })
    )
  })

  it('signs the JWT with the user id, role, and phone in the payload', async () => {
    const user = makeUser({ id: 'user-aaa-111', role: 'CUSTOMER' })
    const deps = makeDepsWithActiveSession({}, user)
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    const decoded = jwt.decode(result.data.accessToken) as jwt.JwtPayload
    expect(decoded.sub).toBe('user-aaa-111')
    expect(decoded.role).toBe('CUSTOMER')
    expect(decoded.phone).toBe('+966512345678')
  })

  it('stores the refresh token in the database', async () => {
    const user = makeUser()
    const deps = makeDepsWithActiveSession({}, user)
    const verifyOtp = makeUC(deps)

    await verifyOtp(validInput)

    expect(deps.refreshTokenPersistor.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: user.id,
        token: expect.any(String),
        expiresAt: expect.any(Date),
        userAgent: 'TestApp/1.0',
        ipAddress: '127.0.0.1',
      })
    )
  })

  it('marks the OTP session as verified on success', async () => {
    const session = makeOtpSession({ id: 'otp-sess-abc' })
    const user = makeUser()
    const deps = makeDepsWithActiveSession({ id: 'otp-sess-abc' }, user)
    const verifyOtp = makeUC(deps)

    await verifyOtp(validInput)

    expect(deps.otpSessionPersistor.markVerified).toHaveBeenCalledWith('otp-sess-abc')
  })

  it('throws OtpExpiredError when there is no active session', async () => {
    const deps = buildDeps()
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp(validInput)).rejects.toMatchObject({
      errorCode: 'OTP_EXPIRED',
      statusCode: 400,
    })
  })

  it('throws OtpExpiredError when the session TTL has elapsed', async () => {
    const deps = makeDepsWithActiveSession({
      expiresAt: new Date(Date.now() - 1000),
    }, makeUser())
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp(validInput)).rejects.toMatchObject({
      errorCode: 'OTP_EXPIRED',
      statusCode: 400,
    })
  })

  it('throws OtpInvalidError and increments attempt count for a wrong code', async () => {
    const session = makeOtpSession({ code: '9999' })
    const deps = buildDeps({
      otpSessionLoader: {
        getActiveSession: jest.fn().mockResolvedValue(session),
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
    })
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp({ ...validInput, code: '1234' })).rejects.toMatchObject({
      errorCode: 'OTP_INVALID',
      statusCode: 400,
    })

    expect(deps.otpSessionPersistor.incrementAttempt).toHaveBeenCalledWith(session.id)
    expect(deps.otpSessionPersistor.markVerified).not.toHaveBeenCalled()
  })

  it('throws AuthenticationError when an ADMIN tries to log in via OTP', async () => {
    const adminUser = makeUser({ role: 'ADMIN' })
    const deps = makeDepsWithActiveSession({}, adminUser)
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError when an OPS user tries to log in via OTP', async () => {
    const opsUser = makeUser({ role: 'OPS' })
    const deps = makeDepsWithActiveSession({}, opsUser)
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError for a deactivated user', async () => {
    const inactiveUser = makeUser({ isActive: false })
    const deps = makeDepsWithActiveSession({}, inactiveUser)
    const verifyOtp = makeUC(deps)

    await expect(verifyOtp(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('allows a DRIVER to log in via OTP without creating a new account', async () => {
    const driver = makeUser({ role: 'DRIVER', id: 'driver-001' })
    const deps = makeDepsWithActiveSession({}, driver)
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    expect(result.data.isNewUser).toBe(false)
    expect(deps.userPersistor.createUser).not.toHaveBeenCalled()
  })

  it('strips the password field from the returned user object', async () => {
    const userWithPassword = makeUser({ password: '$2b$10$hashed' })
    const deps = makeDepsWithActiveSession({}, userWithPassword)
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    expect((result.data.user as any).password).toBeUndefined()
  })

  it('returns onboardingComplete=false for a brand-new user', async () => {
    const deps = buildDeps({
      otpSessionLoader: {
        getActiveSession: jest.fn().mockResolvedValue(makeOtpSession()),
        getLockedSession: jest.fn().mockResolvedValue(null),
        getRecentAttemptCount: jest.fn().mockResolvedValue(0),
      },
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(null),
        getUserByPhone: jest.fn().mockResolvedValue(null),
        getUserByEmail: jest.fn().mockResolvedValue(null),
      },
      userPersistor: {
        createUser: jest.fn().mockResolvedValue(makeUser()),
        updateUser: jest.fn().mockResolvedValue(makeUser()),
      },
    })
    const verifyOtp = makeUC(deps)

    const result = await verifyOtp(validInput)

    expect(result.data.user.onboardingComplete).toBe(false)
  })
})
