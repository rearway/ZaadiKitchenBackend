import { makeUC } from '../GetDeliveryLabels'
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

describe('GetDeliveryLabels', () => {
  it('groups labels by area and computes order refs in printed order', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([
          makeRow({ deliveryDayId: 'dd-1', areaId: 'area-1', areaName: 'Al Nakheel' }),
          makeRow({ deliveryDayId: 'dd-2', areaId: 'area-1', areaName: 'Al Nakheel', mealType: 'salad' }),
          makeRow({ deliveryDayId: 'dd-3', areaId: 'area-2', areaName: 'Olaya' }),
        ]),
      },
    })
    const getDeliveryLabels = makeUC(deps)

    const result = await getDeliveryLabels({ date: '2026-08-02' })

    expect(result.total_count).toBe(3)
    expect(result.filtered_count).toBe(3)
    expect(result.bulk_download_label).toBe('Download All Labels (3)')
    expect(result.areas).toHaveLength(2)
    expect(result.areas[0]).toMatchObject({ area_name: 'Al Nakheel', count: 2 })
    expect(result.areas[0].labels.map((l: { order_ref: string }) => l.order_ref)).toEqual([
      '#PL-2026-08-02-0001',
      '#PL-2026-08-02-0002',
    ])
    expect(result.areas[1]).toMatchObject({ area_name: 'Olaya', count: 1 })
  })

  it('narrows filtered_count by meal_type but keeps total_count unfiltered', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([
          makeRow({ deliveryDayId: 'dd-1', mealType: 'executive' }),
          makeRow({ deliveryDayId: 'dd-2', mealType: 'salad' }),
        ]),
      },
    })
    const getDeliveryLabels = makeUC(deps)

    const result = await getDeliveryLabels({ date: '2026-08-02', mealType: 'executive' })

    expect(result.total_count).toBe(2)
    expect(result.filtered_count).toBe(1)
    expect(result.bulk_download_label).toBe('Download Exec Labels (1)')
    expect(result.areas[0].area_download_label).toBe('Download Exec Al Nakheel (1)')
  })

  it('passes the areaId filter through to the loader', async () => {
    const deps = buildDeps()
    const getDeliveryLabels = makeUC(deps)

    await getDeliveryLabels({ date: '2026-08-02', areaId: 'area-1' })

    expect(deps.deliveryDayLoader.getRiderDeliveriesByDate).toHaveBeenCalledWith('2026-08-02', 'area-1')
  })
})
