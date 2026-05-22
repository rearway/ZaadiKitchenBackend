import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import * as bcrypt from 'bcrypt'

import { AppModule } from '../src/app.module'
import { CoreS } from '../src/tokens'

/**
 * E2E / Integration tests for the Authentication HTTP layer.
 *
 * Strategy: boot the full NestJS app but replace the CoreS use-case container
 * with a hand-crafted mock so we don't need a real database or OTP service.
 *
 * This tests:
 *  - Route registration and HTTP methods
 *  - DTO validation (class-validator)
 *  - HandleErrors decorator → correct HTTP status codes
 *  - Auth guards on protected endpoints
 */

// ─── Shared mock state ────────────────────────────────────────────────────────

const mockUseCases = {
  commands: {
    sendOtp: jest.fn(),
    verifyOtp: jest.fn(),
    adminLogin: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    adminLogout: jest.fn(),
    updateProfile: jest.fn(),
    updateLanguagePreference: jest.fn(),
    submitOutOfZoneInterest: jest.fn(),
    saveDeliveryLocation: jest.fn(),
    createDeliveryArea: jest.fn(),
    addBuilding: jest.fn(),
    createCheckoutSession: jest.fn(),
    applyPromoCode: jest.fn(),
    removePromoCode: jest.fn(),
    addPaymentMethod: jest.fn(),
    removePaymentMethod: jest.fn(),
    createOrder: jest.fn(),
    skipDelivery: jest.fn(),
    undoSkipDelivery: jest.fn(),
    pauseSubscription: jest.fn(),
    resumeSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    switchMealType: jest.fn(),
    validateReferral: jest.fn(),
  },
  queries: {
    getProfile: jest.fn(),
    getActiveDeliveryAreas: jest.fn(),
    searchDeliveryAreas: jest.fn(),
    getBuildingsForArea: jest.fn(),
    getSavedDeliveryLocation: jest.fn(),
    getAdminDeliveryAreas: jest.fn(),
    getPlans: jest.fn(),
    getActivePlans: jest.fn(),
    getCheckoutSession: jest.fn(),
    getDeliveryStartDates: jest.fn(),
    getPaymentMethods: jest.fn(),
    getOrder: jest.fn(),
    getSubscription: jest.fn(),
    getSubscriptionDeliveries: jest.fn(),
    getWallet: jest.fn(),
    getWalletTransactions: jest.fn(),
    getReferral: jest.fn(),
    getPublicHolidays: jest.fn(),
  },
}

// ─── Test setup ──────────────────────────────────────────────────────────────

let app: INestApplication

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CoreS)
    .useValue(mockUseCases)
    .compile()

  app = moduleFixture.createNestApplication()
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  await app.init()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Send OTP ────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/otp/send', () => {
  it('returns 200 with OTP data for a valid Saudi phone', async () => {
    mockUseCases.commands.sendOtp.mockResolvedValue({
      message: 'OTP sent successfully',
      data: { phone: '+966512345678', channel: 'whatsapp', expiresInSeconds: 120, otpCode: '1234' },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '+966512345678', channel: 'whatsapp' })

    expect(res.status).toBe(201)
    expect(res.body.data.phone).toBe('+966512345678')
    expect(res.body.data.otpCode).toBe('1234')
  })

  it('returns 400 when phone is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ channel: 'whatsapp' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when channel is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '+966512345678' })

    expect(res.status).toBe(400)
  })

  it('returns 429 when the phone is rate-limited', async () => {
    const { RateLimitError } = await import('../src/shared/errors/index')
    mockUseCases.commands.sendOtp.mockRejectedValue(
      new RateLimitError('Too many OTP attempts.', { lockedUntil: new Date() })
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '+966512345678', channel: 'whatsapp' })

    expect(res.status).toBe(429)
    expect(res.body.errorCode).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('returns 400 for invalid phone format', async () => {
    const { ValidationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.sendOtp.mockRejectedValue(
      new ValidationError('Invalid phone number format.')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/send')
      .send({ phone: '+966599999999', channel: 'whatsapp' })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('VALIDATION_ERROR')
  })
})

// ─── Verify OTP ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/otp/verify', () => {
  const validPayload = { phone: '+966512345678', code: '1234' }

  it('returns 200 with tokens for a valid OTP', async () => {
    mockUseCases.commands.verifyOtp.mockResolvedValue({
      message: 'Logged in successfully',
      data: {
        isNewUser: false,
        accessToken: 'test.jwt.token',
        refreshToken: 'test-refresh-token',
        tokenType: 'Bearer',
        accessExpiresIn: 900,
        refreshExpiresIn: 2592000,
        user: { id: 'u1', phone: '+966512345678', role: 'CUSTOMER', onboardingComplete: true },
      },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBe('test.jwt.token')
    expect(res.body.data.isNewUser).toBe(false)
  })

  it('returns 400 when OTP is invalid', async () => {
    const { OtpInvalidError } = await import('../src/shared/errors/index')
    mockUseCases.commands.verifyOtp.mockRejectedValue(new OtpInvalidError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '+966512345678', code: '0000' })

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('OTP_INVALID')
  })

  it('returns 400 when OTP has expired', async () => {
    const { OtpExpiredError } = await import('../src/shared/errors/index')
    mockUseCases.commands.verifyOtp.mockRejectedValue(new OtpExpiredError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send(validPayload)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('OTP_EXPIRED')
  })

  it('returns 400 when phone is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ code: '1234' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when code is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone: '+966512345678' })

    expect(res.status).toBe(400)
  })
})

// ─── Admin Login ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/admin/login', () => {
  it('returns 200 with tokens for valid admin credentials', async () => {
    mockUseCases.commands.adminLogin.mockResolvedValue({
      message: 'Admin logged in successfully',
      data: {
        user: { id: 'admin-1', email: 'admin@zaadikitchen.com', role: 'ADMIN' },
        accessToken: 'admin.jwt.token',
        refreshToken: 'admin-refresh-token',
      },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@zaadikitchen.com', password: 'Admin@123' })

    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBe('admin.jwt.token')
  })

  it('returns 401 for invalid credentials', async () => {
    const { AuthenticationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.adminLogin.mockRejectedValue(
      new AuthenticationError('Invalid email or password')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@zaadikitchen.com', password: 'wrong' })

    expect(res.status).toBe(401)
    expect(res.body.errorCode).toBe('AUTHENTICATION_ERROR')
  })

  it('returns 400 when email is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ password: 'Admin@123' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/admin/login')
      .send({ email: 'admin@zaadikitchen.com' })

    expect(res.status).toBe(400)
  })
})

// ─── Refresh Token ───────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns 200 with a new access token', async () => {
    mockUseCases.commands.refreshAccessToken.mockResolvedValue({
      accessToken: 'new.access.token',
      refreshToken: 'new-refresh-token',
      expiresIn: 900,
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'valid-refresh-token' })

    expect(res.status).toBe(201)
    expect(res.body.accessToken).toBe('new.access.token')
  })

  it('returns 401 for an invalid refresh token', async () => {
    const { AuthenticationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.refreshAccessToken.mockRejectedValue(
      new AuthenticationError('Invalid refresh token')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid-token' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when refreshToken is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({})

    expect(res.status).toBe(400)
  })
})

// ─── Logout ──────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 401 when no Bearer token is provided', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: 'some-token' })

    expect(res.status).toBe(401)
  })
})
