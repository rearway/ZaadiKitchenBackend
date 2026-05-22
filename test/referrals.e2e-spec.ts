import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

import { AppModule } from '../src/app.module'
import { CoreS } from '../src/tokens'

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

let app: INestApplication
let bearerToken: string

function makeJwt(payload = { sub: 'user-uuid-1', role: 'CUSTOMER', phone: '+966512345678' }) {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'test-secret', { expiresIn: '1h' })
}

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

  bearerToken = makeJwt()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── GET /referrals/me ────────────────────────────────────────────────────────

describe('GET /api/v1/referrals/me', () => {
  const mockReferral = {
    referral_code: 'AHMED10',
    discount_type: 'referral',
    discount_percent: 10,
    times_used: 3,
    total_earned_sar: 150,
    referred_users: [
      { name: 'Khalid', joined_at: '2025-05-01' },
    ],
  }

  it('returns 200 with referral details', async () => {
    mockUseCases.queries.getReferral.mockResolvedValue(mockReferral)

    const res = await request(app.getHttpServer())
      .get('/api/v1/referrals/me')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.referral_code).toBe('AHMED10')
    expect(res.body.times_used).toBe(3)
    expect(res.body.total_earned_sar).toBe(150)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/referrals/me')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getReferral.mockResolvedValue(mockReferral)

    await request(app.getHttpServer())
      .get('/api/v1/referrals/me')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getReferral).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })
})

// ─── POST /referrals/validate ─────────────────────────────────────────────────

describe('POST /api/v1/referrals/validate', () => {
  it('returns 200 with valid referral for a new user', async () => {
    mockUseCases.commands.validateReferral.mockResolvedValue({
      valid: true,
      code: 'FRIEND10',
      discount_type: 'referral',
      discount_percent: 10,
      discount_label: '10% off your first order',
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'FRIEND10' })

    expect(res.status).toBe(200)
    expect(res.body.valid).toBe(true)
    expect(res.body.discount_percent).toBe(10)
  })

  it('returns 200 with valid result for a general promo code', async () => {
    mockUseCases.commands.validateReferral.mockResolvedValue({
      valid: true,
      code: 'SUMMER25',
      discount_type: 'promo',
      discount_percent: 25,
      discount_label: '25% off',
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'SUMMER25', plan_id: 'month' })

    expect(res.status).toBe(200)
    expect(res.body.valid).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .send({ code: 'FRIEND10' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when code is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 422 when the code does not exist', async () => {
    const { InvalidCodeError } = await import('../src/shared/errors/index')
    mockUseCases.commands.validateReferral.mockRejectedValue(new InvalidCodeError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'BADCODE' })

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('INVALID_CODE')
  })

  it('returns 422 when using a referral code as an existing subscriber', async () => {
    const { NotNewUserError } = await import('../src/shared/errors/index')
    mockUseCases.commands.validateReferral.mockRejectedValue(new NotNewUserError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'FRIEND10' })

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('NOT_NEW_USER')
  })

  it('returns 422 when the code is not valid for the selected plan', async () => {
    const { PlanMismatchError } = await import('../src/shared/errors/index')
    mockUseCases.commands.validateReferral.mockRejectedValue(new PlanMismatchError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'MONTHONLY', plan_id: 'try_it' })

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('PLAN_MISMATCH')
  })

  it('passes userId, code and plan_id to the use case', async () => {
    mockUseCases.commands.validateReferral.mockResolvedValue({ valid: true })

    await request(app.getHttpServer())
      .post('/api/v1/referrals/validate')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'SUMMER25', plan_id: 'month' })

    expect(mockUseCases.commands.validateReferral).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', code: 'SUMMER25', planId: 'month' })
    )
  })
})
