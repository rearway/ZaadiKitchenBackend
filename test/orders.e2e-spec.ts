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

// ─── GET /orders/:order_id ────────────────────────────────────────────────────

describe('GET /api/v1/orders/:order_id', () => {
  const mockOrder = {
    order_id: 'order-uuid-1',
    subscription_id: 'sub-uuid-1',
    status: 'confirmed',
    is_new_user: true,
    plan_id: 'month',
    meal_type: 'executive',
    meal_count: 22,
    start_date: '2025-06-01',
    first_delivery_label: 'Sunday, 1 Jun',
    summary: {
      plan_price_sar: 500,
      wallet_credit_sar: 0,
      promo_discount_sar: 0,
      promo_code: null,
      discount_label: null,
      total_paid_sar: 500,
    },
  }

  it('returns 200 with order details', async () => {
    mockUseCases.queries.getOrder.mockResolvedValue(mockOrder)

    const res = await request(app.getHttpServer())
      .get('/api/v1/orders/order-uuid-1')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.order_id).toBe('order-uuid-1')
    expect(res.body.status).toBe('confirmed')
    expect(res.body.summary.total_paid_sar).toBe(500)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/orders/order-uuid-1')

    expect(res.status).toBe(401)
  })

  it('passes userId and orderId to the use case', async () => {
    mockUseCases.queries.getOrder.mockResolvedValue(mockOrder)

    await request(app.getHttpServer())
      .get('/api/v1/orders/order-uuid-99')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getOrder).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', orderId: 'order-uuid-99' })
    )
  })

  it('returns 404 when the order does not exist or belongs to another user', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.queries.getOrder.mockRejectedValue(
      new ResourceNotFoundError('Order', 'order-uuid-other')
    )

    const res = await request(app.getHttpServer())
      .get('/api/v1/orders/order-uuid-other')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})
