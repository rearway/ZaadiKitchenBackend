import { makeUC } from '../GetMenuMeta'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import type { AppSetting } from '../../../entities/AppSetting'

describe('GetMenuMeta meal display names', () => {
  it('keeps filter ids as slugs and uses display names as labels', async () => {
    const rows: AppSetting[] = [
      {
        key: 'meal_types',
        value: [
          {
            slug: 'executive',
            name_en: 'Platio Balanced',
            name_ar: 'Platio متوازن',
            short_en: 'Balanced',
            short_ar: 'متوازن',
            sort: 1,
          },
          {
            slug: 'salad',
            name_en: 'Platio Light',
            name_ar: 'Platio لايت',
            short_en: 'Light',
            short_ar: 'لايت',
            sort: 2,
          },
        ],
        updatedBy: null,
        updatedAt: new Date('2026-10-30T00:00:00.000Z'),
      },
    ]
    const deps = buildDeps({
      appSettingsLoader: { getAll: jest.fn().mockResolvedValue(rows) },
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1' })
    expect(result.filter_options).toEqual([
      { id: 'all', label: 'All', is_default: true },
      { id: 'executive', label: 'Platio Balanced', is_default: false },
      { id: 'salad', label: 'Platio Light', is_default: false },
    ])
  })
})
