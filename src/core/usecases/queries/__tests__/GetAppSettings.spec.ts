import { readFileSync } from 'node:fs'
import path from 'node:path'

import { makeUC } from '../GetAppSettings'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import {
  resetMealTypeDisplays,
  mealTypeNameEn,
} from '../../../../shared/meal-display'
import {
  DEFAULT_APP_VERSIONS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_ORDERING,
  DEFAULT_SUPPORT,
} from '../../services/appSettingsPayload'
import { DayMealTypeLimitError } from '../../../../shared/errors/domain.errors'
import type { AppSetting } from '../../../entities/AppSetting'

const UPDATED = new Date('2026-10-30T12:00:00.000Z')

function row(key: string, value: unknown, updatedAt = UPDATED): AppSetting {
  return { key, value, updatedBy: 'user-secret', updatedAt }
}

describe('GetAppSettings', () => {
  afterEach(() => {
    resetMealTypeDisplays()
  })

  it('returns placeholder defaults when the table is empty', async () => {
    const result = await makeUC(buildDeps())({})

    expect(result.version).toBe('defaults')
    expect(result.updated_at).toBeNull()
    expect(result.meal_types).toEqual([
      expect.objectContaining({
        slug: 'executive',
        name_en: 'Platio Balanced',
        name_ar: 'Platio متوازن',
        short_en: 'Balanced',
        short_ar: 'متوازن',
        sort: 1,
      }),
      expect.objectContaining({
        slug: 'salad',
        name_en: 'Platio Light',
        short_en: 'Light',
        sort: 2,
      }),
    ])
    expect(result.app_versions).toEqual(DEFAULT_APP_VERSIONS)
    expect(result.support).toEqual(DEFAULT_SUPPORT)
    expect(result.ordering).toEqual(DEFAULT_ORDERING)
    expect(result.feature_flags).toEqual(DEFAULT_FEATURE_FLAGS)
    expect(result.update).toEqual({ status: 'none' })
  })

  it('propagates unexpected loader errors instead of hiding them', async () => {
    const deps = buildDeps({
      appSettingsLoader: {
        getAll: jest.fn().mockRejectedValue(new Error('relation app_settings does not exist')),
      },
    })

    await expect(makeUC(deps)({})).rejects.toThrow('relation app_settings')
  })

  it('computes force, optional, and none from semver', async () => {
    const deps = buildDeps({
      appSettingsLoader: {
        getAll: jest.fn().mockResolvedValue([
          row('app_versions', {
            ios: { min: '1.2.0', latest: '1.4.0', store_url: 'https://apps.apple.com/app/id1' },
            android: { min: '2.0.0', latest: '2.1.0', store_url: 'https://play.google.com/store/apps/details?id=sa.platio' },
            extra: 'do-not-leak',
          }),
          row('meal_types', [
            {
              slug: 'salad',
              name_en: 'Light Custom',
              name_ar: 'لايت',
              short_en: 'Lite',
              short_ar: 'ل',
              sort: 1,
            },
            {
              slug: 'executive',
              name_en: 'Balanced Custom',
              name_ar: 'متوازن',
              short_en: 'Bal',
              short_ar: 'م',
              sort: 2,
            },
          ]),
        ]),
      },
    })
    const getAppSettings = makeUC(deps)

    await expect(getAppSettings({ platform: 'ios', appVersion: '1.1.0' })).resolves.toMatchObject({
      update: { status: 'force' },
    })
    await expect(getAppSettings({ platform: 'ios', appVersion: '1.3.0' })).resolves.toMatchObject({
      update: { status: 'optional' },
    })
    await expect(getAppSettings({ platform: 'ios', appVersion: '1.4.0' })).resolves.toMatchObject({
      update: { status: 'none' },
    })
    await expect(getAppSettings({ platform: 'ios', appVersion: '1.2.0-rc.1' })).resolves.toMatchObject({
      update: { status: 'force' },
    })
    await expect(getAppSettings({ platform: 'web', appVersion: '0.0.1' })).resolves.toMatchObject({
      update: { status: 'none' },
    })
    await expect(getAppSettings({ platform: 'android', appVersion: 'not-semver' })).resolves.toMatchObject({
      update: { status: 'none' },
    })

    const body = await getAppSettings({ platform: 'ios', appVersion: '1.4.0' })
    expect(body.version).toBe(UPDATED.toISOString())
    expect(body.updated_at).toBe(UPDATED.toISOString())
    expect(body.meal_types.map(item => item.slug)).toEqual(['salad', 'executive'])
    expect(body.app_versions.ios.store_url).toBe('https://apps.apple.com/app/id1')
    const json = JSON.stringify(body)
    expect(json).not.toContain('do-not-leak')
    expect(json).not.toContain('user-secret')
    expect(mealTypeNameEn('executive')).toBe('Balanced Custom')
  })

  it('drops secret keys and unknown support fields', async () => {
    const deps = buildDeps({
      appSettingsLoader: {
        getAll: jest.fn().mockResolvedValue([
          row('moyasar', { secret: 'sk_live_should_not_leak' }),
          row('support', {
            whatsapp: '+966511111111',
            email: 'help@platio.sa',
            phone: '+966522222222',
            api_key: 'sk_live_should_not_leak',
          }),
          row('feature_flags', {
            menu_day_picker: false,
            referrals: true,
            internal_token: 'sk_live_should_not_leak',
          }),
        ]),
      },
    })

    const result = await makeUC(deps)({})
    const json = JSON.stringify(result)
    expect(json).not.toContain('sk_live')
    expect(json).not.toContain('moyasar')
    expect(json).not.toContain('internal_token')
    expect(result.support).toEqual({
      whatsapp: '+966511111111',
      email: 'help@platio.sa',
      phone: '+966522222222',
    })
    expect(result.feature_flags).toEqual({
      menu_day_picker: false,
      referrals: true,
    })
    expect(result.meal_types[0].name_en).toBe('Platio Balanced')
  })

  it('uses display names from settings in domain errors after a load', async () => {
    const deps = buildDeps({
      appSettingsLoader: {
        getAll: jest.fn().mockResolvedValue([
          row('meal_types', [
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
              name_en: 'Custom Light',
              name_ar: 'لايت',
              short_en: 'Lite',
              short_ar: 'ل',
              sort: 2,
            },
          ]),
        ]),
      },
    })
    await makeUC(deps)({})
    expect(new DayMealTypeLimitError('salad', '2026-10-01', 3).message).toContain(
      'Custom Light'
    )
  })

  it('keeps the seeder copy aligned with the public defaults', () => {
    const source = readFileSync(
      path.join(
        __dirname,
        '../../../../infrastructure/SequelizePersistence/seeders/20261030130001-seed-app-settings.js'
      ),
      'utf8'
    )
    expect(source).toContain('Platio Balanced')
    expect(source).toContain('Platio Light')
    expect(source).toContain('Platio متوازن')
    expect(source).toContain('Platio لايت')
    expect(source).toContain("cutoff_local_time: '18:00'")
    expect(source).toContain("timezone: 'Asia/Riyadh'")
    expect(source).toContain('menu_day_picker: true')
    expect(source).toContain('referrals: true')
    expect(source).toContain(DEFAULT_SUPPORT.email)
    expect(source).toContain(DEFAULT_APP_VERSIONS.ios.store_url)
  })
})
