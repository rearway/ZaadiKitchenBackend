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

// ─── GET /plans/active ────────────────────────────────────────────────────────

describe('GET /api/v1/plans/active', () => {
  const mockActivePlans = {
    wallet_balance_sar: 75,
    plans: [
      {
        id: 'try_it',
        name: 'Try It',
        price_sar: 28,
        meal_count: 1,
        is_most_popular: false,
        is_last_plan: false,
      },
      {
        id: 'month',
        name: 'Month Plan',
        price_sar: 500,
        meal_count: 22,
        is_most_popular: true,
        is_last_plan: true,
      },
    ],
  }

  it('returns 200 with active plans and wallet balance', async () => {
    mockUseCases.queries.getActivePlans.mockResolvedValue(mockActivePlans)

    const res = await request(app.getHttpServer())
      .get('/api/v1/plans/active')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.plans).toHaveLength(2)
    expect(res.body.wallet_balance_sar).toBe(75)
    expect(res.body.plans[1].is_most_popular).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/plans/active')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getActivePlans.mockResolvedValue(mockActivePlans)

    await request(app.getHttpServer())
      .get('/api/v1/plans/active')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getActivePlans).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })

  it('returns an empty plans list when no plans are active', async () => {
    mockUseCases.queries.getActivePlans.mockResolvedValue({ wallet_balance_sar: 0, plans: [] })

    const res = await request(app.getHttpServer())
      .get('/api/v1/plans/active')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.plans).toHaveLength(0)
    expect(res.body.wallet_balance_sar).toBe(0)
  })
})

// ─── GET /plans ───────────────────────────────────────────────────────────────

describe('GET /api/v1/plans', () => {
  const mockPlans = [
    { id: 'try_it', name: 'Try It', price_sar: 28, meal_count: 1 },
    { id: 'month', name: 'Month Plan', price_sar: 500, meal_count: 22 },
  ]

  it('returns 200 with all plans', async () => {
    mockUseCases.queries.getPlans.mockResolvedValue(mockPlans)

    const res = await request(app.getHttpServer())
      .get('/api/v1/plans')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/plans')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getPlans.mockResolvedValue(mockPlans)

    await request(app.getHttpServer())
      .get('/api/v1/plans')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getPlans).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })
})
