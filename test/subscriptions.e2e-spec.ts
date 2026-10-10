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

// ─── GET /subscriptions/me ────────────────────────────────────────────────────

describe('GET /api/v1/subscriptions/me', () => {
  const mockSubscription = {
    subscription_id: 'sub-uuid-1',
    status: 'active',
    plan_id: 'month',
    plan_name: 'Month Plan',
    meal_type: 'executive',
    meal_count: 22,
    delivered_count: 5,
    remaining_count: 17,
    start_date: '2025-06-01',
    end_date: '2025-06-30',
    days_remaining: 25,
    skip_days_allowed: 6,
    skip_days_used: 1,
    skip_days_remaining: 5,
    paused_until: null,
  }

  it('returns 200 with subscription details', async () => {
    mockUseCases.queries.getSubscription.mockResolvedValue(mockSubscription)

    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.subscription_id).toBe('sub-uuid-1')
    expect(res.body.status).toBe('active')
    expect(res.body.skip_days_remaining).toBe(5)
  })

  it('returns 401 when no auth token is provided', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')

    expect(res.status).toBe(401)
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.queries.getSubscription.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getSubscription.mockResolvedValue(mockSubscription)

    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })
})

// ─── GET /subscriptions/me/deliveries ─────────────────────────────────────────

describe('GET /api/v1/subscriptions/me/deliveries', () => {
  const mockDeliveries = {
    deliveries: [
      {
        date: '2025-06-01',
        label: 'Sunday, 1 Jun',
        status: 'scheduled',
        is_skippable: true,
        skip_reason: null,
        is_undoable: false,
        meal_name: 'Executive Meal',
      },
      {
        date: '2025-06-02',
        label: 'Monday, 2 Jun',
        status: 'skipped',
        is_skippable: false,
        skip_reason: null,
        is_undoable: true,
        meal_name: 'Executive Meal',
      },
    ],
    skip_limit_reached: false,
  }

  it('returns 200 with delivery list', async () => {
    mockUseCases.queries.getSubscriptionDeliveries.mockResolvedValue(mockDeliveries)

    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me/deliveries')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.deliveries).toHaveLength(2)
    expect(res.body.skip_limit_reached).toBe(false)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me/deliveries')

    expect(res.status).toBe(401)
  })

  it('passes from and to query params to the use case', async () => {
    mockUseCases.queries.getSubscriptionDeliveries.mockResolvedValue(mockDeliveries)

    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me/deliveries?from=2025-06-01&to=2025-06-30')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getSubscriptionDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', from: '2025-06-01', to: '2025-06-30' })
    )
  })

  it('works without from/to query params', async () => {
    mockUseCases.queries.getSubscriptionDeliveries.mockResolvedValue(mockDeliveries)

    await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me/deliveries')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getSubscriptionDeliveries).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', from: undefined, to: undefined })
    )
  })

  it('returns 404 when user has no subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.queries.getSubscriptionDeliveries.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .get('/api/v1/subscriptions/me/deliveries')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── POST /subscriptions/me/deliveries/:date/skip ─────────────────────────────

describe('POST /api/v1/subscriptions/me/deliveries/:delivery_date/skip', () => {
  const mockSkipResult = {
    date: '2025-06-01',
    status: 'skipped',
    skip_days_used: 2,
    skip_days_remaining: 4,
  }

  it('returns 200 with updated skip state', async () => {
    mockUseCases.commands.skipDelivery.mockResolvedValue(mockSkipResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('skipped')
    expect(res.body.skip_days_remaining).toBe(4)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')

    expect(res.status).toBe(401)
  })

  it('passes delivery date and user id to the use case', async () => {
    mockUseCases.commands.skipDelivery.mockResolvedValue(mockSkipResult)

    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-15/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.commands.skipDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', deliveryDate: '2025-06-15' })
    )
  })

  it('returns 422 when the 6 PM cutoff has passed', async () => {
    const { PastCutoffError } = await import('../src/shared/errors/index')
    mockUseCases.commands.skipDelivery.mockRejectedValue(new PastCutoffError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-05-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('PAST_CUTOFF')
  })

  it('returns 409 when skip limit has been reached', async () => {
    const { SkipLimitReachedError } = await import('../src/shared/errors/index')
    mockUseCases.commands.skipDelivery.mockRejectedValue(
      new SkipLimitReachedError({ skip_days_allowed: 6, skip_days_used: 6 })
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(409)
    expect(res.body.errorCode).toBe('SKIP_LIMIT_REACHED')
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.skipDelivery.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })

  it('returns 400 when the delivery day is already skipped', async () => {
    const { ValidationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.skipDelivery.mockRejectedValue(
      new ValidationError('This delivery day is already skipped.')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('VALIDATION_ERROR')
  })
})

// ─── DELETE /subscriptions/me/deliveries/:date/skip ───────────────────────────

describe('DELETE /api/v1/subscriptions/me/deliveries/:delivery_date/skip', () => {
  const mockUndoResult = {
    date: '2025-06-01',
    status: 'scheduled',
    skip_days_used: 1,
    skip_days_remaining: 5,
  }

  it('returns 200 with restored delivery status', async () => {
    mockUseCases.commands.undoSkipDelivery.mockResolvedValue(mockUndoResult)

    const res = await request(app.getHttpServer())
      .delete('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('scheduled')
    expect(res.body.skip_days_remaining).toBe(5)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')

    expect(res.status).toBe(401)
  })

  it('passes delivery date and user id to the use case', async () => {
    mockUseCases.commands.undoSkipDelivery.mockResolvedValue(mockUndoResult)

    await request(app.getHttpServer())
      .delete('/api/v1/subscriptions/me/deliveries/2025-06-10/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.commands.undoSkipDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', deliveryDate: '2025-06-10' })
    )
  })

  it('returns 422 when the 6 PM cutoff has passed', async () => {
    const { PastCutoffError } = await import('../src/shared/errors/index')
    mockUseCases.commands.undoSkipDelivery.mockRejectedValue(new PastCutoffError())

    const res = await request(app.getHttpServer())
      .delete('/api/v1/subscriptions/me/deliveries/2025-05-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(422)
    expect(res.body.errorCode).toBe('PAST_CUTOFF')
  })

  it('returns 404 when the delivery day is not in skipped status', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.undoSkipDelivery.mockRejectedValue(
      new ResourceNotFoundError('Skipped delivery day', '2025-06-01')
    )

    const res = await request(app.getHttpServer())
      .delete('/api/v1/subscriptions/me/deliveries/2025-06-01/skip')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── POST /subscriptions/me/pause ─────────────────────────────────────────────

describe('POST /api/v1/subscriptions/me/pause', () => {
  const validPayload = { start_date: '2025-06-10', end_date: '2025-06-14' }

  const mockPauseResult = {
    subscription_id: 'sub-uuid-1',
    status: 'paused',
    paused_from: '2025-06-10',
    paused_until: '2025-06-14',
    pause_days_used: 5,
    pause_days_remaining: 10,
    message: 'Subscription paused from 10 Jun to 14 Jun.',
  }

  it('returns 200 with pause confirmation', async () => {
    mockUseCases.commands.pauseSubscription.mockResolvedValue(mockPauseResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('paused')
    expect(res.body.paused_until).toBe('2025-06-14')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('returns 400 when start_date is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ end_date: '2025-06-14' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when end_date is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ start_date: '2025-06-10' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when start_date has invalid format', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ start_date: '10/06/2025', end_date: '2025-06-14' })

    expect(res.status).toBe(400)
  })

  it('passes userId, startDate and endDate to the use case', async () => {
    mockUseCases.commands.pauseSubscription.mockResolvedValue(mockPauseResult)

    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(mockUseCases.commands.pauseSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        startDate: '2025-06-10',
        endDate: '2025-06-14',
      })
    )
  })

  it('returns 409 when pause limit would be exceeded', async () => {
    const { PauseLimitExceededError } = await import('../src/shared/errors/index')
    mockUseCases.commands.pauseSubscription.mockRejectedValue(
      new PauseLimitExceededError({ days_requested: 10, days_remaining: 3 })
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(409)
    expect(res.body.errorCode).toBe('PAUSE_LIMIT_EXCEEDED')
  })

  it('returns 400 when subscription is already paused', async () => {
    const { ValidationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.pauseSubscription.mockRejectedValue(
      new ValidationError('Subscription is already paused.')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.pauseSubscription.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/pause')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── POST /subscriptions/me/resume ────────────────────────────────────────────

describe('POST /api/v1/subscriptions/me/resume', () => {
  const validPayload = { resume_date: '2025-06-15' }

  const mockResumeResult = {
    subscription_id: 'sub-uuid-1',
    status: 'active',
    first_delivery_label: 'Sunday, 15 Jun',
    message: 'Your subscription will resume on Sunday, 15 Jun.',
  }

  it('returns 200 with resume confirmation', async () => {
    mockUseCases.commands.resumeSubscription.mockResolvedValue(mockResumeResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/resume')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('active')
    expect(res.body.first_delivery_label).toBe('Sunday, 15 Jun')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/resume')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('passes userId and resumeDate to the use case', async () => {
    mockUseCases.commands.resumeSubscription.mockResolvedValue(mockResumeResult)

    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/resume')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(mockUseCases.commands.resumeSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', resumeDate: '2025-06-15' })
    )
  })

  it('returns 400 when subscription is not paused', async () => {
    const { ValidationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.resumeSubscription.mockRejectedValue(
      new ValidationError('Subscription is not paused.')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/resume')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.resumeSubscription.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/resume')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── POST /subscriptions/me/cancel ────────────────────────────────────────────

describe('POST /api/v1/subscriptions/me/cancel', () => {
  const mockCancelResult = {
    subscription_id: 'sub-uuid-1',
    status: 'cancelled',
    end_date: '2025-06-30',
    refund_sar: 0,
    message: 'Your subscription has been cancelled. Your last delivery will be 30 Jun.',
  }

  it('returns 200 with cancellation confirmation', async () => {
    mockUseCases.commands.cancelSubscription.mockResolvedValue(mockCancelResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/cancel')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('cancelled')
    expect(res.body.refund_sar).toBe(0)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/cancel')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.commands.cancelSubscription.mockResolvedValue(mockCancelResult)

    await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/cancel')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.commands.cancelSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })

  it('returns 400 when subscription is already cancelled', async () => {
    const { ValidationError } = await import('../src/shared/errors/index')
    mockUseCases.commands.cancelSubscription.mockRejectedValue(
      new ValidationError('Subscription is already cancelled.')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/cancel')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(400)
    expect(res.body.errorCode).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.cancelSubscription.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/subscriptions/me/cancel')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── PATCH /subscriptions/me/meal-type ────────────────────────────────────────

describe('PATCH /api/v1/subscriptions/me/meal-type', () => {
  const validPayload = { meal_type: 'salad', apply_to: 'all' }

  const mockSwitchResult = {
    subscription_id: 'sub-uuid-1',
    meal_type: 'salad',
    updated_days: 17,
    message: 'Meal type switched to Salad for all remaining deliveries.',
  }

  it('returns 200 with switch confirmation', async () => {
    mockUseCases.commands.switchMealType.mockResolvedValue(mockSwitchResult)

    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(200)
    expect(res.body.meal_type).toBe('salad')
    expect(res.body.updated_days).toBe(17)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('returns 400 when meal_type is invalid', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ meal_type: 'vegan', apply_to: 'all' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when apply_to is invalid', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ meal_type: 'salad', apply_to: 'tomorrow' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when meal_type is missing', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ apply_to: 'all' })

    expect(res.status).toBe(400)
  })

  it('passes userId, mealType, applyTo and specificDays to the use case', async () => {
    mockUseCases.commands.switchMealType.mockResolvedValue(mockSwitchResult)

    await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ meal_type: 'salad', apply_to: 'specific', specific_days: ['2025-06-01', '2025-06-02'] })

    expect(mockUseCases.commands.switchMealType).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        mealType: 'salad',
        applyTo: 'specific',
        specificDays: ['2025-06-01', '2025-06-02'],
      })
    )
  })

  it('returns 404 when user has no active subscription', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.commands.switchMealType.mockRejectedValue(
      new ResourceNotFoundError('Subscription')
    )

    const res = await request(app.getHttpServer())
      .patch('/api/v1/subscriptions/me/meal-type')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})
