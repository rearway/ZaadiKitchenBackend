import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

import { AppModule } from '../src/app.module'
import { CoreS } from '../src/tokens'

/**
 * E2E / Integration tests for the Rider HTTP layer.
 *
 * Strategy: boot the full NestJS app but replace the CoreS use-case container
 * with a hand-crafted mock (same pattern as auth.e2e-spec.ts), so this tests
 * route registration, role-guard scoping to DRIVER only, and DTO validation
 * — not business logic (that's covered by the usecase specs and the
 * DB-backed integration spec for the area/status filtering flow).
 */

const mockUseCases = {
  commands: {
    markDeliveryDelivered: jest.fn(),
    reportRiderIssue: jest.fn(),
  },
  queries: {
    getMyDeliveries: jest.fn(),
  },
}

let app: INestApplication

function makeJwt(payload: Record<string, unknown>) {
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
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
})

const DRIVER_TOKEN_PAYLOAD = { sub: 'rider-uuid-1', role: 'DRIVER', phone: '+966511111111' }

// ─── GET /api/v1/rider/deliveries ─────────────────────────────────────────────

describe('GET /api/v1/rider/deliveries', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/rider/deliveries')
    expect(res.status).toBe(401)
    expect(mockUseCases.queries.getMyDeliveries).not.toHaveBeenCalled()
  })

  it.each(['CUSTOMER', 'ADMIN', 'OPS'])('returns 403 for a %s-role token (DRIVER only)', async role => {
    const token = makeJwt({ sub: 'user-uuid-1', role, phone: '+966511111111' })

    const res = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(403)
    expect(mockUseCases.queries.getMyDeliveries).not.toHaveBeenCalled()
  })

  it('returns 200 for a DRIVER token with no query params, using the JWT sub as riderId', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.queries.getMyDeliveries.mockResolvedValue({
      date: '2026-08-02',
      rider_name: 'Khalid Al-Harbi',
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })

    const res = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.queries.getMyDeliveries).toHaveBeenCalledWith({
      riderId: 'rider-uuid-1',
      date: undefined,
      areaId: undefined,
    })
  })

  it('passes date and area_id query params through to the usecase', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.queries.getMyDeliveries.mockResolvedValue({
      date: '2026-08-02',
      rider_name: 'Khalid Al-Harbi',
      total_deliveries: 0,
      delivered_count: 0,
      pending_count: 0,
      deliveries: [],
    })

    const res = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .query({ date: '2026-08-02', area_id: '11111111-1111-4111-8111-111111111111' })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.queries.getMyDeliveries).toHaveBeenCalledWith({
      riderId: 'rider-uuid-1',
      date: '2026-08-02',
      areaId: '11111111-1111-4111-8111-111111111111',
    })
  })

  it('returns 400 for a malformed date and never calls the usecase', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)

    const res = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .query({ date: '08-02-2026' })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(mockUseCases.queries.getMyDeliveries).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-UUID area_id and never calls the usecase', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)

    const res = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .query({ area_id: 'not-a-uuid' })
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(400)
    expect(mockUseCases.queries.getMyDeliveries).not.toHaveBeenCalled()
  })

  it('two different DRIVER tokens querying the same date/area get identical delivery data — there is no per-rider filtering', async () => {
    const payload = {
      date: '2026-08-02',
      rider_name: '',
      total_deliveries: 1,
      delivered_count: 0,
      pending_count: 1,
      deliveries: [{ delivery_id: 'dd-1', status: 'pending' }],
    }
    mockUseCases.queries.getMyDeliveries.mockResolvedValue(payload)

    const tokenA = makeJwt({ sub: 'rider-a', role: 'DRIVER' })
    const tokenB = makeJwt({ sub: 'rider-b', role: 'DRIVER' })

    const resA = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .query({ date: '2026-08-02' })
      .set('Authorization', `Bearer ${tokenA}`)
    const resB = await request(app.getHttpServer())
      .get('/api/v1/rider/deliveries')
      .query({ date: '2026-08-02' })
      .set('Authorization', `Bearer ${tokenB}`)

    expect(resA.body.deliveries).toEqual(resB.body.deliveries)
    expect(mockUseCases.queries.getMyDeliveries).toHaveBeenNthCalledWith(1, {
      riderId: 'rider-a',
      date: '2026-08-02',
      areaId: undefined,
    })
    expect(mockUseCases.queries.getMyDeliveries).toHaveBeenNthCalledWith(2, {
      riderId: 'rider-b',
      date: '2026-08-02',
      areaId: undefined,
    })
  })
})

// ─── POST /api/v1/rider/deliveries/:id/delivered ──────────────────────────────

describe('POST /api/v1/rider/deliveries/:delivery_id/delivered', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/rider/deliveries/dd-1/delivered')
    expect(res.status).toBe(401)
  })

  it('returns 200 with the delivered status on success', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.commands.markDeliveryDelivered.mockResolvedValue({
      message: 'Delivery marked as delivered',
      data: { delivery_id: 'dd-1', status: 'delivered', delivered_at: new Date('2026-08-02T12:32:00Z') },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/rider/deliveries/dd-1/delivered')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('delivered')
    expect(mockUseCases.commands.markDeliveryDelivered).toHaveBeenCalledWith({ deliveryId: 'dd-1' })
  })

  it('returns 409 when the usecase reports ALREADY_DELIVERED', async () => {
    const { AlreadyDeliveredError } = await import('../src/shared/errors/domain.errors')
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.commands.markDeliveryDelivered.mockRejectedValue(new AlreadyDeliveredError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/rider/deliveries/dd-1/delivered')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(409)
    expect(res.body.errorCode).toBe('ALREADY_DELIVERED')
  })

  it('returns 404 when the usecase reports DELIVERY_NOT_FOUND', async () => {
    const { DeliveryNotFoundError } = await import('../src/shared/errors/domain.errors')
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.commands.markDeliveryDelivered.mockRejectedValue(new DeliveryNotFoundError())

    const res = await request(app.getHttpServer())
      .post('/api/v1/rider/deliveries/missing-id/delivered')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
    expect(res.body.errorCode).toBe('DELIVERY_NOT_FOUND')
  })
})

// ─── POST /api/v1/rider/deliveries/:id/issue ──────────────────────────────────

describe('POST /api/v1/rider/deliveries/:delivery_id/issue', () => {
  it('returns 201 for a valid issue report', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)
    mockUseCases.commands.reportRiderIssue.mockResolvedValue({
      message: 'Issue reported successfully',
      data: {
        rider_issue_id: 'ri-1',
        delivery_id: 'dd-1',
        issue_type: 'customer_not_found',
        notes: null,
        reported_at: new Date(),
      },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/rider/deliveries/dd-1/issue')
      .set('Authorization', `Bearer ${token}`)
      .send({ issue_type: 'customer_not_found' })

    expect(res.status).toBe(201)
    expect(mockUseCases.commands.reportRiderIssue).toHaveBeenCalledWith({
      deliveryId: 'dd-1',
      riderId: 'rider-uuid-1',
      issueType: 'customer_not_found',
      notes: undefined,
    })
  })

  it('returns 400 for an invalid issue_type and never calls the usecase', async () => {
    const token = makeJwt(DRIVER_TOKEN_PAYLOAD)

    const res = await request(app.getHttpServer())
      .post('/api/v1/rider/deliveries/dd-1/issue')
      .set('Authorization', `Bearer ${token}`)
      .send({ issue_type: 'bogus_reason' })

    expect(res.status).toBe(400)
    expect(mockUseCases.commands.reportRiderIssue).not.toHaveBeenCalled()
  })
})
