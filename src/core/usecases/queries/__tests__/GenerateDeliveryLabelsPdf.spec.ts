import { makeUC } from '../GenerateDeliveryLabelsPdf'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    deliveryDayId: 'dd-1',
    customerName: 'Ahmed Al-Rashidi',
    buildingName: 'Al Nakheel Tower',
    floor: 'Floor 7',
    deskArea: 'Desk B12',
    gate: 'Main entrance',
    deliveryPreference: 'hand_to_me' as const,
    riderNotes: null,
    areaId: 'area-1',
    areaName: 'Al Nakheel',
    mealType: 'executive' as const,
    mealName: 'Lamb Kabsa',
    status: 'scheduled' as const,
    deliveredAt: null,
    ...overrides,
  }
}

describe('GenerateDeliveryLabelsPdf', () => {
  it('generates a real, non-empty PDF for the day', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([makeRow(), makeRow({ deliveryDayId: 'dd-2', mealType: 'salad' })]),
      },
    })
    const generateDeliveryLabelsPdf = makeUC(deps)

    const result = await generateDeliveryLabelsPdf({ date: '2026-08-02' })

    expect(result.buffer.length).toBeGreaterThan(0)
    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF')
    expect(result.filename).toBe('zaadi-labels-2026-08-02-all.pdf')
  })

  it('renders only the matching label when labelId is given', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([
          makeRow({ deliveryDayId: 'dd-1' }),
          makeRow({ deliveryDayId: 'dd-2' }),
        ]),
      },
    })
    const generateDeliveryLabelsPdf = makeUC(deps)

    const result = await generateDeliveryLabelsPdf({ date: '2026-08-02', labelId: 'dd-2' })

    expect(result.buffer.subarray(0, 4).toString()).toBe('%PDF')
    expect(result.filename).toBe('zaadi-label-dd-2.pdf')
  })

  it('throws RESOURCE_NOT_FOUND when labelId does not match any delivery', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([makeRow({ deliveryDayId: 'dd-1' })]),
      },
    })
    const generateDeliveryLabelsPdf = makeUC(deps)

    await expect(
      generateDeliveryLabelsPdf({ date: '2026-08-02', labelId: 'missing' })
    ).rejects.toMatchObject({ errorCode: 'RESOURCE_NOT_FOUND', statusCode: 404 })
  })
})
