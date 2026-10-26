import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import request from 'supertest'
import * as jwt from 'jsonwebtoken'

import { AppModule } from '../src/app.module'
import { CoreS } from '../src/tokens'
import { AreaAlreadyAssignedError } from '../src/shared/errors'

const mockUseCases = {
  commands: {
    createDriver: jest.fn(),
    updateDriver: jest.fn(),
    deleteDriver: jest.fn(),
    assignDriverArea: jest.fn(),
  },
  queries: {
    getAdminDrivers: jest.fn(),
    getAdminDriver: jest.fn(),
    getAdminDriverDeliveries: jest.fn(),
    listUnassignedAreas: jest.fn(),
  },
}

let app: INestApplication

function makeJwt(payload: Record<string, unknown>) {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'test-secret', {
    expiresIn: '1h',
  })
}

const ADMIN = {
  sub: 'admin-uuid-1',
  role: 'ADMIN',
  email: 'admin@zaadikitchen.com',
}
const AREA_A = '11111111-1111-4111-8111-111111111111'

beforeAll(async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CoreS)
    .useValue(mockUseCases)
    .compile()

  app = moduleFixture.createNestApplication()
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  )
  await app.init()
})

afterAll(async () => {
  await app.close()
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Admin drivers', () => {
  it('returns 401 for list without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/drivers')
    expect(res.status).toBe(401)
    expect(mockUseCases.queries.getAdminDrivers).not.toHaveBeenCalled()
  })

  it.each(['DRIVER', 'OPS', 'CUSTOMER'])(
    'returns 403 for a %s token',
    async role => {
      const token = makeJwt({ sub: 'user-1', role })
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/drivers')
        .set('Authorization', `Bearer ${token}`)
      expect(res.status).toBe(403)
      expect(mockUseCases.queries.getAdminDrivers).not.toHaveBeenCalled()
    }
  )

  it('lists drivers for an ADMIN token', async () => {
    mockUseCases.queries.getAdminDrivers.mockResolvedValue({
      message: 'Drivers retrieved successfully',
      data: { drivers: [] },
    })
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/drivers')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.queries.getAdminDrivers).toHaveBeenCalledWith({})
  })

  it('creates a driver and maps snake_case body fields', async () => {
    mockUseCases.commands.createDriver.mockResolvedValue({
      message: 'Driver created successfully',
      data: { id: 'driver-1', role: 'DRIVER' },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/drivers')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)
      .send({
        full_name: 'Faisal Al-Harbi',
        phone: '+966512345678',
        area_ids: [AREA_A],
      })

    expect(res.status).toBe(201)
    expect(mockUseCases.commands.createDriver).toHaveBeenCalledWith({
      fullName: 'Faisal Al-Harbi',
      phone: '+966512345678',
      areaIds: [AREA_A],
    })
  })

  it('returns 400 when area_ids contains a non-uuid', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/drivers')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)
      .send({
        full_name: 'Faisal',
        phone: '+966512345678',
        area_ids: ['north'],
      })

    expect(res.status).toBe(400)
    expect(mockUseCases.commands.createDriver).not.toHaveBeenCalled()
  })

  it('patches a driver and replaces areas when area_ids is sent', async () => {
    mockUseCases.commands.updateDriver.mockResolvedValue({
      message: 'Driver updated successfully',
      data: { id: 'driver-1' },
    })

    const res = await request(app.getHttpServer())
      .patch('/api/v1/admin/drivers/driver-1')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)
      .send({ is_active: false, area_ids: [] })

    expect(res.status).toBe(200)
    expect(mockUseCases.commands.updateDriver).toHaveBeenCalledWith({
      driverId: 'driver-1',
      fullName: undefined,
      phone: undefined,
      isActive: false,
      areaIds: [],
    })
  })

  it('lists unassigned areas for an ADMIN token', async () => {
    mockUseCases.queries.listUnassignedAreas.mockResolvedValue({
      message: 'Unassigned areas retrieved successfully',
      data: { areas: [] },
    })

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/drivers/unassigned-areas')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.queries.listUnassignedAreas).toHaveBeenCalledWith({})
    expect(mockUseCases.queries.getAdminDriver).not.toHaveBeenCalled()
  })

  it('returns 401 for unassigned areas without a token', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/admin/drivers/unassigned-areas'
    )
    expect(res.status).toBe(401)
    expect(mockUseCases.queries.listUnassignedAreas).not.toHaveBeenCalled()
  })

  it('loads a driver day and passes the ops date', async () => {
    mockUseCases.queries.getAdminDriverDeliveries.mockResolvedValue({
      message: 'Driver deliveries retrieved successfully',
      data: { deliveries: [] },
    })

    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/drivers/driver-1/deliveries')
      .query({ date: '2026-10-26' })
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.queries.getAdminDriverDeliveries).toHaveBeenCalledWith({
      driverId: 'driver-1',
      date: '2026-10-26',
    })
  })

  it('returns 400 for a delivery date that is not YYYY-MM-DD', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/drivers/driver-1/deliveries')
      .query({ date: '26-10-2026' })
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)

    expect(res.status).toBe(400)
    expect(mockUseCases.queries.getAdminDriverDeliveries).not.toHaveBeenCalled()
  })

  it('assigns an area from area_id', async () => {
    mockUseCases.commands.assignDriverArea.mockResolvedValue({
      message: 'Area assigned successfully',
      data: { id: 'driver-1' },
    })

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/drivers/driver-1/areas')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)
      .send({ area_id: AREA_A })

    expect(res.status).toBe(200)
    expect(mockUseCases.commands.assignDriverArea).toHaveBeenCalledWith({
      driverId: 'driver-1',
      areaId: AREA_A,
    })
  })

  it('returns 409 when the area already belongs to another driver', async () => {
    mockUseCases.commands.assignDriverArea.mockRejectedValue(
      new AreaAlreadyAssignedError(
        'Olaya',
        'Fahad Al-Otaibi',
        AREA_A,
        'driver-2'
      )
    )

    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/drivers/driver-1/areas')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)
      .send({ area_id: AREA_A })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      statusCode: 409,
      errorCode: 'AREA_ALREADY_ASSIGNED',
      message:
        'Area "Olaya" is already assigned to Fahad Al-Otaibi. One area = one driver.',
      details: {
        area_id: AREA_A,
        area_name: 'Olaya',
        driver_id: 'driver-2',
        driver_name: 'Fahad Al-Otaibi',
      },
      operation: 'assign-driver-area',
    })
  })

  it('soft-deletes a driver', async () => {
    mockUseCases.commands.deleteDriver.mockResolvedValue({
      message: 'Driver deleted successfully',
      data: { id: 'driver-1', deleted: true },
    })

    const res = await request(app.getHttpServer())
      .delete('/api/v1/admin/drivers/driver-1')
      .set('Authorization', `Bearer ${makeJwt(ADMIN)}`)

    expect(res.status).toBe(200)
    expect(mockUseCases.commands.deleteDriver).toHaveBeenCalledWith({
      driverId: 'driver-1',
    })
  })
})
