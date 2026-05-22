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

// ─── GET /payment/methods ─────────────────────────────────────────────────────

describe('GET /api/v1/payment/methods', () => {
  const mockMethods = [
    {
      id: 'pm-uuid-1',
      type: 'card',
      last4: '4242',
      brand: 'Visa',
      expiry: '12/27',
      is_default: true,
    },
    {
      id: 'pm-uuid-2',
      type: 'card',
      last4: '1234',
      brand: 'Mastercard',
      expiry: '06/26',
      is_default: false,
    },
  ]

  it('returns 200 with saved payment methods', async () => {
    mockUseCases.queries.getPaymentMethods.mockResolvedValue(mockMethods)

    const res = await request(app.getHttpServer())
      .get('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].last4).toBe('4242')
    expect(res.body[0].is_default).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/payment/methods')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getPaymentMethods.mockResolvedValue(mockMethods)

    await request(app.getHttpServer())
      .get('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getPaymentMethods).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })

  it('returns an empty array when user has no saved methods', async () => {
    mockUseCases.queries.getPaymentMethods.mockResolvedValue([])

    const res = await request(app.getHttpServer())
      .get('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(0)
  })
})

// ─── POST /payment/methods ────────────────────────────────────────────────────

describe('POST /api/v1/payment/methods', () => {
  const validPayload = { type: 'visa', token: 'tok_test_abc123' }

  const mockAddResult = {
    id: 'pm-uuid-new',
    type: 'card',
    last4: '9999',
    brand: 'Visa',
    expiry: '09/28',
    is_default: false,
  }

  it('returns 201 with the new payment method', async () => {
    mockUseCases.commands.addPaymentMethod.mockResolvedValue(mockAddResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.id).toBe('pm-uuid-new')
    expect(res.body.last4).toBe('9999')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('returns 400 when type is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ token: 'tok_test_abc123' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when token is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ type: 'card' })

    expect(res.status).toBe(400)
  })

  it('passes userId, type and token to the use case', async () => {
    mockUseCases.commands.addPaymentMethod.mockResolvedValue(mockAddResult)

    await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(mockUseCases.commands.addPaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', type: 'visa', token: 'tok_test_abc123' })
    )
  })

  it('returns 402 when the payment gateway rejects the card', async () => {
    const { PaymentFailedError } = await import('../src/shared/errors/index')
    mockUseCases.commands.addPaymentMethod.mockRejectedValue(
      new PaymentFailedError('Card declined')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/payment/methods')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(402)
    expect(res.body.errorCode).toBe('PAYMENT_FAILED')
  })
})

// ─── DELETE /payment/methods/:method_id ───────────────────────────────────────

describe('DELETE /api/v1/payment/methods/:method_id', () => {
  it('returns 204 when method is successfully removed', async () => {
    mockUseCases.commands.removePaymentMethod.mockResolvedValue(undefined)

    const res = await request(app.getHttpServer())
      .delete('/api/v1/payment/methods/pm-uuid-1')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(204)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/payment/methods/pm-uuid-1')

    expect(res.status).toBe(401)
  })

  it('passes userId and methodId to the use case', async () => {
    mockUseCases.commands.removePaymentMethod.mockResolvedValue(undefined)

    await request(app.getHttpServer())
      .delete('/api/v1/payment/methods/pm-uuid-99')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.commands.removePaymentMethod).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', methodId: 'pm-uuid-99' })
    )
  })

  it('returns 404 when method does not belong to the user', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.removePaymentMethod.mockRejectedValue(
      new ResourceNotFoundError('PaymentMethod', 'pm-other-user')
    )

    const res = await request(app.getHttpServer())
      .delete('/api/v1/payment/methods/pm-other-user')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})
