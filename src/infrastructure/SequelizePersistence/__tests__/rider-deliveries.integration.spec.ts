import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { Sequelize } from 'sequelize-typescript'

import {
  UserModel,
  DeliveryAreaModel,
  BuildingModel,
  DeliveryLocationModel,
  PlanModel,
  OrderModel,
  SubscriptionModel,
  DeliveryDayModel,
} from '../models/index.js'
import { SubscriptionPersistenceService } from '../subscription-persistence.service.js'
import { UserPersistenceService } from '../user-persistence.service.js'
import { buildDeps } from '../../../__tests__/helpers/mock-deps.js'
import { makeUC as makeGetMyDeliveries } from '../../../core/usecases/queries/GetMyDeliveries.js'
import { makeUC as makeMarkDeliveryDelivered } from '../../../core/usecases/commands/MarkDeliveryDelivered.js'

/**
 * DB-backed integration test for the rider "deliveries by area + status" flow.
 *
 * Unlike every other spec in this repo, this one talks to the real local
 * Postgres (docker-compose, see backend/docker-compose.yml) instead of
 * mocking the loader/persistor interfaces. It seeds its own throwaway
 * fixtures (all tagged with a random run id) and deletes them in `afterAll`.
 *
 * Requires: `docker compose up -d` + migrations applied
 * (`node_modules/.bin/sequelize-cli db:migrate`).
 */

const RUN_ID = randomUUID().slice(0, 8)
const TEST_DATE = '2099-01-04' // far future — can never collide with real data

describe('Rider deliveries — area + status filtering (real DB)', () => {
  let sequelize: Sequelize
  const deliveryDayService = new SubscriptionPersistenceService()
  const userService = new UserPersistenceService()

  // Fixture ids, populated in beforeAll, deleted in afterAll.
  const createdIds = {
    deliveryDays: [] as string[],
    subscriptions: [] as string[],
    orders: [] as string[],
    deliveryLocations: [] as string[],
    users: [] as string[],
    areas: [] as string[],
    plans: [] as string[],
  }

  let areaNorth: DeliveryAreaModel
  let areaSouth: DeliveryAreaModel
  let rider: UserModel
  let custNorthScheduled: UserModel // "Zulu Bldg" — the row later driven through mark-delivered
  let custNorthDelivered: UserModel // "Alpha Bldg" — already delivered
  let custSouthPastCutoff: UserModel
  let custSouthSkipped: UserModel
  let custNorthPaused: UserModel
  let custNoPrimaryLocation: UserModel

  let rowNorthScheduledId: string
  let rowNorthDeliveredId: string
  let rowSouthPastCutoffId: string

  async function makeCustomer(fullName: string, phoneSuffix: string): Promise<UserModel> {
    const user = await UserModel.create({
      fullName,
      role: 'CUSTOMER',
      phone: `+9665${RUN_ID.replace(/[^0-9]/g, '1')}${phoneSuffix}`.slice(0, 15),
      languagePreference: 'EN',
      isActive: true,
    })
    createdIds.users.push(user.id)
    return user
  }

  async function makeSubscriptionFor(user: UserModel, plan: PlanModel) {
    const order = await OrderModel.create({
      userId: user.id,
      planId: plan.id,
      mealType: 'executive',
      mealCount: 5,
      startDate: TEST_DATE,
      planPriceSar: 100,
      totalPaidSar: 100,
      status: 'confirmed',
    })
    createdIds.orders.push(order.id)

    const subscription = await SubscriptionModel.create({
      userId: user.id,
      orderId: order.id,
      planId: plan.id,
      mealType: 'executive',
      status: 'active',
      totalMealDays: 5,
      startDate: TEST_DATE,
      endDate: TEST_DATE,
      skipDaysAllowed: 2,
      pauseDaysAllowed: 2,
    })
    createdIds.subscriptions.push(subscription.id)
    return subscription
  }

  async function makeDeliveryDay(
    user: UserModel,
    subscriptionId: string,
    status: 'scheduled' | 'past_cutoff' | 'delivered' | 'skipped' | 'paused',
    mealName: string,
    deliveredAt: Date | null = null
  ) {
    const day = await DeliveryDayModel.create({
      subscriptionId,
      userId: user.id,
      date: TEST_DATE,
      mealType: 'executive',
      mealName,
      status,
      deliveredAt,
    })
    createdIds.deliveryDays.push(day.id)
    return day
  }

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'postgres',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5433),
      username: process.env.DB_USERNAME ?? 'zaadi',
      password: process.env.DB_PASSWORD ?? 'zaadi_dev_password',
      database: process.env.DB_NAME ?? 'zaadi_kitchen',
      models: [
        UserModel,
        DeliveryAreaModel,
        BuildingModel,
        DeliveryLocationModel,
        PlanModel,
        OrderModel,
        SubscriptionModel,
        DeliveryDayModel,
      ],
      logging: false,
    })
    await sequelize.authenticate()

    // ── Areas ──────────────────────────────────────────────────────────────
    areaNorth = await DeliveryAreaModel.create({ name: `QA_Area_North_${RUN_ID}`, status: 'active' })
    areaSouth = await DeliveryAreaModel.create({ name: `QA_Area_South_${RUN_ID}`, status: 'active' })
    createdIds.areas.push(areaNorth.id, areaSouth.id)

    // ── Plan ───────────────────────────────────────────────────────────────
    const plan = await PlanModel.create({
      name: `QA Test Plan ${RUN_ID}`,
      slug: `qa_test_${RUN_ID}`,
      priceSar: 100,
      mealCount: 5,
      pricePerMealSar: 20,
      skipDaysAllowed: 2,
      pauseDaysAllowed: 2,
    })
    createdIds.plans.push(plan.id)

    // ── Rider (driver) ────────────────────────────────────────────────────
    rider = await UserModel.create({
      fullName: 'QA Test Rider',
      role: 'DRIVER',
      phone: `+96650${RUN_ID.replace(/[^0-9]/g, '9')}`.slice(0, 15),
      languagePreference: 'EN',
      isActive: true,
    })
    createdIds.users.push(rider.id)

    // ── Customers + delivery locations ──────────────────────────────────────
    custNorthScheduled = await makeCustomer('QA Zulu Customer', '01')
    custNorthDelivered = await makeCustomer('QA Alpha Customer', '02')
    custSouthPastCutoff = await makeCustomer('QA South Customer', '03')
    custSouthSkipped = await makeCustomer('QA Skipped Customer', '04')
    custNorthPaused = await makeCustomer('QA Paused Customer', '05')
    custNoPrimaryLocation = await makeCustomer('QA NoPrimary Customer', '06')

    const locations: Array<[UserModel, DeliveryAreaModel, string, boolean]> = [
      [custNorthScheduled, areaNorth, 'QA Bldg Zulu', true],
      [custNorthDelivered, areaNorth, 'QA Bldg Alpha', true],
      [custSouthPastCutoff, areaSouth, 'QA Bldg South', true],
      [custSouthSkipped, areaSouth, 'QA Bldg South Skip', true],
      [custNorthPaused, areaNorth, 'QA Bldg Paused', true],
      [custNoPrimaryLocation, areaNorth, 'QA Bldg NoPrimary', false], // is_primary: false
    ]
    for (const [user, area, buildingName, isPrimary] of locations) {
      const loc = await DeliveryLocationModel.create({
        userId: user.id,
        areaId: area.id,
        buildingName,
        floor: 'Floor 3',
        deskArea: 'Desk 9',
        gate: 'Gate 1',
        deliveryPreference: 'hand_to_me',
        riderNotes: `QA note for ${buildingName}`,
        isPrimary,
      })
      createdIds.deliveryLocations.push(loc.id)
    }

    // ── Subscriptions + delivery_days ───────────────────────────────────────
    const subNorthScheduled = await makeSubscriptionFor(custNorthScheduled, plan)
    const subNorthDelivered = await makeSubscriptionFor(custNorthDelivered, plan)
    const subSouthPastCutoff = await makeSubscriptionFor(custSouthPastCutoff, plan)
    const subSouthSkipped = await makeSubscriptionFor(custSouthSkipped, plan)
    const subNorthPaused = await makeSubscriptionFor(custNorthPaused, plan)
    const subNoPrimary = await makeSubscriptionFor(custNoPrimaryLocation, plan)

    const rowScheduled = await makeDeliveryDay(custNorthScheduled, subNorthScheduled.id, 'scheduled', 'QA Lamb Kabsa')
    rowNorthScheduledId = rowScheduled.id

    const rowDelivered = await makeDeliveryDay(
      custNorthDelivered,
      subNorthDelivered.id,
      'delivered',
      'QA Chicken Rice',
      new Date('2099-01-04T12:32:00Z')
    )
    rowNorthDeliveredId = rowDelivered.id

    const rowPastCutoff = await makeDeliveryDay(custSouthPastCutoff, subSouthPastCutoff.id, 'past_cutoff', 'QA Salad Bowl')
    rowSouthPastCutoffId = rowPastCutoff.id

    await makeDeliveryDay(custSouthSkipped, subSouthSkipped.id, 'skipped', 'QA Skipped Meal')
    await makeDeliveryDay(custNorthPaused, subNorthPaused.id, 'paused', 'QA Paused Meal')
    await makeDeliveryDay(custNoPrimaryLocation, subNoPrimary.id, 'scheduled', 'QA NoPrimary Meal')
  })

  afterAll(async () => {
    await DeliveryDayModel.destroy({ where: { id: createdIds.deliveryDays } })
    await SubscriptionModel.destroy({ where: { id: createdIds.subscriptions } })
    await OrderModel.destroy({ where: { id: createdIds.orders } })
    await DeliveryLocationModel.destroy({ where: { id: createdIds.deliveryLocations } })
    await UserModel.destroy({ where: { id: createdIds.users } })
    await DeliveryAreaModel.destroy({ where: { id: createdIds.areas } })
    await PlanModel.destroy({ where: { id: createdIds.plans } })
    await sequelize.close()
  })

  // ── 1-8: raw loader (getRiderDeliveriesByDate) ──────────────────────────

  it('1. with no areaId, returns every scheduled/past_cutoff/delivered row and excludes skipped/paused', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE)
    const ids = rows.map(r => r.deliveryDayId)

    expect(ids).toEqual(
      expect.arrayContaining([rowNorthScheduledId, rowNorthDeliveredId, rowSouthPastCutoffId])
    )
    // skipped / paused rows for this run must never appear
    const returnedMealNames = rows.map(r => r.mealName)
    expect(returnedMealNames).not.toContain('QA Skipped Meal')
    expect(returnedMealNames).not.toContain('QA Paused Meal')
  })

  it('2. areaId = North returns only North rows (South excluded)', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaNorth.id)
    const ids = rows.map(r => r.deliveryDayId)

    expect(ids).toEqual(expect.arrayContaining([rowNorthScheduledId, rowNorthDeliveredId]))
    expect(ids).not.toContain(rowSouthPastCutoffId)
    expect(rows.every(r => r.areaId === areaNorth.id)).toBe(true)
  })

  it('3. areaId = South returns only South rows (North excluded)', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaSouth.id)
    const ids = rows.map(r => r.deliveryDayId)

    expect(ids).toEqual([rowSouthPastCutoffId])
  })

  it('4. areaId that matches no delivery_areas row returns an empty array, not an error', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, randomUUID())
    expect(rows).toEqual([])
  })

  it('5. skipped and paused rows never appear, under any areaId (including none)', async () => {
    const all = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE)
    const north = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaNorth.id)
    const south = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaSouth.id)

    for (const rows of [all, north, south]) {
      expect(rows.map(r => r.status)).not.toContain('skipped')
      expect(rows.map(r => r.status)).not.toContain('paused')
    }
  })

  it('6. a customer with no primary delivery location appears under "no area filter" with area:null, and disappears once any areaId filter is applied', async () => {
    const allRows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE)
    const noPrimaryRow = allRows.find(r => r.mealName === 'QA NoPrimary Meal')
    expect(noPrimaryRow).toBeDefined()
    expect(noPrimaryRow!.areaId).toBeNull()
    expect(noPrimaryRow!.areaName).toBeNull()
    expect(noPrimaryRow!.buildingName).toBeNull()

    const northRows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaNorth.id)
    expect(northRows.find(r => r.mealName === 'QA NoPrimary Meal')).toBeUndefined()

    const southRows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaSouth.id)
    expect(southRows.find(r => r.mealName === 'QA NoPrimary Meal')).toBeUndefined()
  })

  it('7. field mapping is precise for a seeded row (building/floor/desk/gate/notes/preference/mealType/mealName)', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaNorth.id)
    const row = rows.find(r => r.deliveryDayId === rowNorthScheduledId)

    expect(row).toMatchObject({
      customerName: 'QA Zulu Customer',
      buildingName: 'QA Bldg Zulu',
      floor: 'Floor 3',
      deskArea: 'Desk 9',
      gate: 'Gate 1',
      riderNotes: 'QA note for QA Bldg Zulu',
      deliveryPreference: 'hand_to_me',
      mealType: 'executive',
      mealName: 'QA Lamb Kabsa',
      status: 'scheduled',
      deliveredAt: null,
    })
  })

  it('8. sorted by area name, then building name, then customer name (null area last)', async () => {
    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE)
    const ourRows = rows.filter(r =>
      [rowNorthDeliveredId, rowNorthScheduledId, rowSouthPastCutoffId].includes(r.deliveryDayId) ||
      r.mealName === 'QA NoPrimary Meal'
    )
    // Expected: North/Bldg Alpha, North/Bldg Zulu, South/Bldg South, then null-area last.
    expect(ourRows.map(r => r.deliveryDayId)).toEqual([
      rowNorthDeliveredId, // QA_Area_North, QA Bldg Alpha
      rowNorthScheduledId, // QA_Area_North, QA Bldg Zulu
      rowSouthPastCutoffId, // QA_Area_South, QA Bldg South
      ourRows[3].deliveryDayId, // QA NoPrimary Meal — area null, sorts last
    ])
    expect(ourRows[3].mealName).toBe('QA NoPrimary Meal')
  })

  // ── 9: through the GetMyDeliveries usecase (status mapping + counts) ────

  it('9. GetMyDeliveries maps scheduled/past_cutoff to "pending" and delivered to "delivered", with correct counts', async () => {
    const deps = buildDeps({
      userLoader: userService,
      deliveryDayLoader: deliveryDayService,
    })
    const getMyDeliveries = makeGetMyDeliveries(deps)

    const result = await getMyDeliveries({ riderId: rider.id, date: TEST_DATE, areaId: areaNorth.id })

    expect(result.rider_name).toBe('QA Test Rider')
    const scheduled = result.deliveries.find(d => d.delivery_id === rowNorthScheduledId)
    const delivered = result.deliveries.find(d => d.delivery_id === rowNorthDeliveredId)
    expect(scheduled?.status).toBe('pending')
    expect(delivered?.status).toBe('delivered')
    expect(delivered?.delivered_at).not.toBeNull()
    expect(result.total_deliveries).toBe(result.delivered_count + result.pending_count)
  })

  // ── 10-12: mark-as-delivered feedback loop, against real DB state ───────

  it('10. marking a scheduled delivery as delivered is reflected back in getRiderDeliveriesByDate and GetMyDeliveries counts', async () => {
    const deps = buildDeps({
      userLoader: userService,
      deliveryDayLoader: deliveryDayService,
      deliveryDayPersistor: deliveryDayService,
    })
    const markDeliveryDelivered = makeMarkDeliveryDelivered(deps)
    const getMyDeliveries = makeGetMyDeliveries(deps)

    const before = await getMyDeliveries({ riderId: rider.id, date: TEST_DATE, areaId: areaNorth.id })
    const beforeDelivered = before.delivered_count

    const result = await markDeliveryDelivered({ deliveryId: rowNorthScheduledId })
    expect(result.data.status).toBe('delivered')
    expect(result.data.delivered_at).toBeTruthy()

    const rows = await deliveryDayService.getRiderDeliveriesByDate(TEST_DATE, areaNorth.id)
    const updatedRow = rows.find(r => r.deliveryDayId === rowNorthScheduledId)
    expect(updatedRow?.status).toBe('delivered')
    expect(updatedRow?.deliveredAt).not.toBeNull()

    const after = await getMyDeliveries({ riderId: rider.id, date: TEST_DATE, areaId: areaNorth.id })
    expect(after.delivered_count).toBe(beforeDelivered + 1)
    expect(after.pending_count).toBe(before.pending_count - 1)
  })

  it('11. marking the same delivery delivered again throws ALREADY_DELIVERED', async () => {
    const deps = buildDeps({
      deliveryDayLoader: deliveryDayService,
      deliveryDayPersistor: deliveryDayService,
    })
    const markDeliveryDelivered = makeMarkDeliveryDelivered(deps)

    await expect(markDeliveryDelivered({ deliveryId: rowNorthScheduledId })).rejects.toMatchObject({
      errorCode: 'ALREADY_DELIVERED',
      statusCode: 409,
    })
  })

  it('12. marking a non-existent delivery id throws DELIVERY_NOT_FOUND', async () => {
    const deps = buildDeps({
      deliveryDayLoader: deliveryDayService,
      deliveryDayPersistor: deliveryDayService,
    })
    const markDeliveryDelivered = makeMarkDeliveryDelivered(deps)

    await expect(markDeliveryDelivered({ deliveryId: randomUUID() })).rejects.toMatchObject({
      errorCode: 'DELIVERY_NOT_FOUND',
      statusCode: 404,
    })
  })
})
