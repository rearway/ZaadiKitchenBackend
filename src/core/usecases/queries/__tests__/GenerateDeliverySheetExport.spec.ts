import { makeUC } from '../GenerateDeliverySheetExport'
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
    riderNotes: 'Call on arrival',
    areaId: 'area-1',
    areaName: 'Al Nakheel',
    mealType: 'executive' as const,
    mealName: 'Lamb Kabsa',
    status: 'scheduled' as const,
    deliveredAt: null,
    ...overrides,
  }
}

describe('GenerateDeliverySheetExport', () => {
  it('generates a real, non-empty XLSX workbook for the day', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getRiderDeliveriesByDate: jest.fn().mockResolvedValue([makeRow(), makeRow({ deliveryDayId: 'dd-2', mealType: 'salad' })]),
      },
    })
    const generateDeliverySheetExport = makeUC(deps)

    const result = await generateDeliverySheetExport({ date: '2026-08-02' })

    expect(result.buffer.length).toBeGreaterThan(0)
    // XLSX files are zip containers, which start with the "PK" magic bytes
    expect(result.buffer.subarray(0, 2).toString()).toBe('PK')
    expect(result.filename).toBe('zaadi-delivery-sheet-2026-08-02.xlsx')
  })

  it('fetches deliveries for the whole day with no area/meal-type filter', async () => {
    const deps = buildDeps()
    const generateDeliverySheetExport = makeUC(deps)

    await generateDeliverySheetExport({ date: '2026-08-02' })

    expect(deps.deliveryDayLoader.getRiderDeliveriesByDate).toHaveBeenCalledWith('2026-08-02')
  })
})
