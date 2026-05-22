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

// ─── GET /users/profile ───────────────────────────────────────────────────────

describe('GET /api/v1/users/profile', () => {
  const mockProfile = {
    id: 'user-uuid-1',
    phone: '+966512345678',
    full_name: 'Ahmed Al-Farsi',
    email: 'ahmed@example.com',
    role: 'CUSTOMER',
    language: 'ar',
    onboarding_complete: true,
  }

  it('returns 200 with user profile', async () => {
    mockUseCases.queries.getProfile.mockResolvedValue(mockProfile)

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('user-uuid-1')
    expect(res.body.phone).toBe('+966512345678')
    expect(res.body.full_name).toBe('Ahmed Al-Farsi')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/profile')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getProfile.mockResolvedValue(mockProfile)

    await request(app.getHttpServer())
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })

  it('returns 404 when user profile is not found', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.queries.getProfile.mockRejectedValue(
      new ResourceNotFoundError('User', 'user-uuid-1')
    )

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})

// ─── POST /users/profile ──────────────────────────────────────────────────────

describe('POST /api/v1/users/profile', () => {
  const validPayload = { fullName: 'Ahmed Al-Farsi', email: 'ahmed@example.com' }

  const mockUpdateResult = {
    id: 'user-uuid-1',
    full_name: 'Ahmed Al-Farsi',
    email: 'ahmed@example.com',
    onboarding_complete: true,
  }

  it('returns 201 with updated profile', async () => {
    mockUseCases.commands.updateProfile.mockResolvedValue(mockUpdateResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/profile')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(res.status).toBe(201)
    expect(res.body.full_name).toBe('Ahmed Al-Farsi')
    expect(res.body.onboarding_complete).toBe(true)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/profile')
      .send(validPayload)

    expect(res.status).toBe(401)
  })

  it('passes userId, fullName and email to the use case', async () => {
    mockUseCases.commands.updateProfile.mockResolvedValue(mockUpdateResult)

    await request(app.getHttpServer())
      .post('/api/v1/users/profile')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(validPayload)

    expect(mockUseCases.commands.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        fullName: 'Ahmed Al-Farsi',
        email: 'ahmed@example.com',
      })
    )
  })
})

// ─── PATCH /users/preferences/language ───────────────────────────────────────

describe('PATCH /api/v1/users/preferences/language', () => {
  it('returns 200 when language preference is updated', async () => {
    mockUseCases.commands.updateLanguagePreference.mockResolvedValue({ language: 'AR' })

    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/preferences/language')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ language: 'AR' })

    expect(res.status).toBe(200)
    expect(res.body.language).toBe('AR')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/preferences/language')
      .send({ language: 'AR' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when language is missing', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/users/preferences/language')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('passes userId and language to the use case', async () => {
    mockUseCases.commands.updateLanguagePreference.mockResolvedValue({ language: 'EN' })

    await request(app.getHttpServer())
      .patch('/api/v1/users/preferences/language')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ language: 'EN' })

    expect(mockUseCases.commands.updateLanguagePreference).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', language: 'EN' })
    )
  })
})

// ─── GET /users/wallet ────────────────────────────────────────────────────────

describe('GET /api/v1/users/wallet', () => {
  const mockWallet = {
    balance_sar: 150,
    currency: 'SAR',
  }

  it('returns 200 with wallet balance', async () => {
    mockUseCases.queries.getWallet.mockResolvedValue(mockWallet)

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/wallet')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.balance_sar).toBe(150)
    expect(res.body.currency).toBe('SAR')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/wallet')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getWallet.mockResolvedValue(mockWallet)

    await request(app.getHttpServer())
      .get('/api/v1/users/wallet')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getWallet).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })
})

// ─── GET /users/wallet/transactions ──────────────────────────────────────────

describe('GET /api/v1/users/wallet/transactions', () => {
  const mockTransactions = {
    transactions: [
      {
        id: 'txn-1',
        type: 'credit',
        amount_sar: 50,
        description: 'Referral bonus',
        created_at: '2025-06-01T10:00:00Z',
      },
      {
        id: 'txn-2',
        type: 'debit',
        amount_sar: 500,
        description: 'Order payment',
        created_at: '2025-06-02T12:00:00Z',
      },
    ],
    total: 2,
    page: 1,
    per_page: 20,
  }

  it('returns 200 with transaction history', async () => {
    mockUseCases.queries.getWalletTransactions.mockResolvedValue(mockTransactions)

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/wallet/transactions')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.transactions).toHaveLength(2)
    expect(res.body.transactions[0].type).toBe('credit')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/wallet/transactions')

    expect(res.status).toBe(401)
  })

  it('passes page and per_page query params to the use case', async () => {
    mockUseCases.queries.getWalletTransactions.mockResolvedValue(mockTransactions)

    await request(app.getHttpServer())
      .get('/api/v1/users/wallet/transactions?page=2&per_page=10')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getWalletTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', page: 2, perPage: 10 })
    )
  })

  it('works without pagination query params', async () => {
    mockUseCases.queries.getWalletTransactions.mockResolvedValue(mockTransactions)

    await request(app.getHttpServer())
      .get('/api/v1/users/wallet/transactions')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getWalletTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1', page: undefined, perPage: undefined })
    )
  })
})

// ─── POST /users/delivery-location ───────────────────────────────────────────

describe('POST /api/v1/users/delivery-location', () => {
  const validBuildingId = '550e8400-e29b-41d4-a716-446655440002'
  const validAreaId = '550e8400-e29b-41d4-a716-446655440001'

  const payloadWithBuildingId = {
    areaId: validAreaId,
    buildingId: validBuildingId,
    floor: '3',
    deskArea: 'Marketing Dept',
    deliveryPreference: 'reception',
    riderNotes: 'Call on arrival',
  }

  const payloadWithFreeText = {
    areaId: validAreaId,
    building: 'Al-Nakheel Tower',
    floor: '3',
    deskArea: 'Marketing Dept',
    deliveryPreference: 'hand_to_me',
  }

  const mockSaveResult = {
    message: 'Delivery location saved successfully',
    data: {
      id: 'loc-uuid-1',
      areaId: validAreaId,
      areaName: 'Al Nakheel',
      buildingId: validBuildingId,
      buildingName: 'Al Nakheel Tower',
      floor: '3',
      deskArea: 'Marketing Dept',
      deliveryPreference: 'reception',
      isPrimary: true,
      onboardingComplete: true,
    },
  }

  it('returns 201 when location is saved using a buildingId from the curated list', async () => {
    mockUseCases.commands.saveDeliveryLocation.mockResolvedValue(mockSaveResult)

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payloadWithBuildingId)

    expect(res.status).toBe(201)
    expect(res.body.data.onboardingComplete).toBe(true)
    expect(res.body.data.buildingId).toBe(validBuildingId)
  })

  it('returns 201 when location is saved using a free-text building name', async () => {
    mockUseCases.commands.saveDeliveryLocation.mockResolvedValue({
      ...mockSaveResult,
      data: { ...mockSaveResult.data, buildingId: undefined, buildingName: 'Al-Nakheel Tower' },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payloadWithFreeText)

    expect(res.status).toBe(201)
    expect(res.body.data.buildingName).toBe('Al-Nakheel Tower')
  })

  it('returns 400 when neither buildingId nor building is provided', async () => {
    const { ValidationError } = require('../src/shared/errors/domain.errors')
    mockUseCases.commands.saveDeliveryLocation.mockRejectedValue(
      new ValidationError('Either a building ID or a building name is required')
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ areaId: validAreaId })

    expect(res.status).toBe(400)
  })

  it('returns 400 when areaId is missing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ building: 'Tower A' })

    expect(res.status).toBe(400)
  })

  it('returns 400 when areaId is not a valid UUID', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ areaId: 'not-a-uuid', building: 'Tower A' })

    expect(res.status).toBe(400)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .send(payloadWithFreeText)

    expect(res.status).toBe(401)
  })

  it('passes the authenticated userId and all fields to the use case', async () => {
    mockUseCases.commands.saveDeliveryLocation.mockResolvedValue(mockSaveResult)

    await request(app.getHttpServer())
      .post('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)
      .send(payloadWithBuildingId)

    expect(mockUseCases.commands.saveDeliveryLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid-1',
        areaId: validAreaId,
        buildingId: validBuildingId,
      })
    )
  })
})

// ─── GET /users/delivery-location ────────────────────────────────────────────

describe('GET /api/v1/users/delivery-location', () => {
  const mockLocation = {
    id: 'loc-uuid-1',
    area_id: 'area-uuid-1',
    area_name: 'King Fahd District',
    building_id: 'building-uuid-1',
    building_name: 'Al-Nakheel Tower',
    floor: '3',
    desk_area: 'Marketing Dept',
  }

  it('returns 200 with saved delivery location', async () => {
    mockUseCases.queries.getSavedDeliveryLocation.mockResolvedValue(mockLocation)

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(200)
    expect(res.body.building_name).toBe('Al-Nakheel Tower')
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/users/delivery-location')

    expect(res.status).toBe(401)
  })

  it('passes the authenticated user id to the use case', async () => {
    mockUseCases.queries.getSavedDeliveryLocation.mockResolvedValue(mockLocation)

    await request(app.getHttpServer())
      .get('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(mockUseCases.queries.getSavedDeliveryLocation).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-uuid-1' })
    )
  })

  it('returns 404 when user has no saved delivery location', async () => {
    const { ResourceNotFoundError } = await import('../src/shared/errors/index')
    mockUseCases.queries.getSavedDeliveryLocation.mockRejectedValue(
      new ResourceNotFoundError('DeliveryLocation')
    )

    const res = await request(app.getHttpServer())
      .get('/api/v1/users/delivery-location')
      .set('Authorization', `Bearer ${bearerToken}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('RESOURCE_NOT_FOUND')
  })
})
