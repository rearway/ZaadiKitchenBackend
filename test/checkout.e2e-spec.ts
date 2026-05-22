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

// ─── Create Checkout Session ──────────────────────────────────────────────────

describe('POST /api/v1/checkout/session', () => {
  const validPayload = { plan_id: 'month', meal_type: 'executive' }

  const mockSessionResponse = {
    session_id: 'sess-uuid-1',
    plan_id: 'month',
    meal_type: 'executive',
    base_price_sar: 500,
    wallet_credit_sar: 0,
    promo_discount_sar: 0,
    total_due_sar: 500,
    promo_code: null,
    promo_attempt_count: 0,
    promo_locked: false,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  }

  it('returns 201 with session data', async () => {
    mockUseCases.commands.createCheckoutSession.mockResolvedValue(mockSessionResponse)

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.session_id).toBe('sess-uuid-1')
    expect(res.body.total_due_sar).toBe(500)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('returns 400 when plan_id is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ meal_type: 'executive' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when meal_type is invalid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ plan_id: 'month', meal_type: 'invalid_type' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when the plan does not exist', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.createCheckoutSession.mockRejectedValue(
      new ResourceNotFoundError('Plan', 'nonexistent')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ plan_id: 'nonexistent', meal_type: 'executive' })

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.commands.createCheckoutSession.mockResolvedValue(mockSessionResponse)

    await request(app.getHttpServer())
      .post('/api/v1/checkout/session')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(mockUseCases.commands.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', planId: 'month', mealType: 'executive' })
    )
  })
})

// ─── Apply Promo Code ─────────────────────────────────────────────────────────

describe('POST /api/v1/checkout/session/:sessionId/promo', () => {
  it('returns 200 with updated session pricing', async () => {
    mockUseCases.commands.applyPromoCode.mockResolvedValue({
      session_id: 'sess-uuid-1',
      promo_code: 'TESTREF10',
      discount_type: 'referral',
      promo_discount_sar: 100,
      total_due_sar: 400,
      promo_attempt_count: 0,
      promo_locked: false,
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session/sess-uuid-1/promo')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'TESTREF10' })

    expect(res.status).toBe(200)
    expect(res.body.promo_discount_sar).toBe(100)
    expect(res.body.total_due_sar).toBe(400)
  })

  it('returns 410 when the session has expired', async () => {
    const { SessionExpiredError } = await import('../src/shared/errors/index')
    mockUseCases.commands.applyPromoCode.mockRejectedValue(new SessionExpiredError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session/expired-session-id/promo')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'TESTREF10' })

    expect(res.status).toBe(410)
    expect(res.body.errorCode).toBe('SESSION_EXPIRED')
  })

  it('returns 422 for an invalid promo code', async () => {
    const { InvalidCodeError } = await import('../src/shared/errors/index')
    mockUseCases.commands.applyPromoCode.mockRejectedValue(new InvalidCodeError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session/sess-uuid-1/promo')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'BADCODE' })

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('INVALID_CODE')
  })

  it('returns 423 when the promo field is locked', async () => {
    const { PromoLockedError } = await import('../src/shared/errors/index')
    mockUseCases.commands.applyPromoCode.mockRejectedValue(
      new PromoLockedError({ promo_attempt_count: 10 })
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session/sess-uuid-1/promo')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ code: 'ANYCODE' })

    expect(res.status).toBe(423)
    expect(res.body.errorCode).toBe('PROMO_LOCKED')
  })

  it('returns 400 when the code field is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/checkout/session/sess-uuid-1/promo')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({})

    expect(res.status).toBe(400)
  })
})

// ─── Create Order ─────────────────────────────────────────────────────────────

describe('POST /api/v1/orders', () => {
  const validPayload = {
    session_id: 'sess-uuid-1',
    payment_method_id: 'pm-uuid-1',
    start_date: '2025-06-01',
  }

  const mockOrderResponse = {
    order_id: 'order-uuid-1',
    subscription_id: 'sub-uuid-1',
    status: 'confirmed',
    is_new_user: true,
    plan_id: 'month',
    meal_type: 'executive',
    meal_count: 22,
    start_date: '2025-06-01',
    first_delivery_label: 'Sunday, 1 Jun',
    summary: { plan_price_sar: 500, wallet_credit_sar: 0, promo_discount_sar: 0, promo_code: null, discount_label: null, total_paid_sar: 500 },
  }

  it('returns 201 with order confirmation', async () => {
    mockUseCases.commands.createOrder.mockResolvedValue(mockOrderResponse)

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.order_id).toBe('order-uuid-1')
    expect(res.body.status).toBe('confirmed')
  })

  it('returns 410 when the checkout session has expired', async () => {
    const { SessionExpiredError } = await import('../src/shared/errors/index')
    mockUseCases.commands.createOrder.mockRejectedValue(new SessionExpiredError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(410)
    expect(res.body.errorCode).toBe('SESSION_EXPIRED')
  })

  it('returns 402 when the payment gateway declines', async () => {
    const { PaymentFailedError } = await import('../src/shared/errors/index')
    mockUseCases.commands.createOrder.mockRejectedValue(
      new PaymentFailedError('Insufficient funds')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(402)
    expect(res.body.errorCode).toBe('PAYMENT_FAILED')
  })

  it('returns 400 when session_id is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ payment_method_id: 'pm-uuid-1', start_date: '2025-06-01' })

    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send(validPayload)

    expect(res.status).toBe(401)
  })
})
