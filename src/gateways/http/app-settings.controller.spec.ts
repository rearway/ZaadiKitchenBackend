import type { Request, Response } from 'express'

import { AppSettingsController } from './app-settings.controller'
import type { UseCases } from '../../core/usecases/index'
import { GUARDS_METADATA } from '@nestjs/common/constants'

function mockRes() {
  const headers: Record<string, string> = {}
  return {
    headers,
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
  }
}

describe('AppSettingsController', () => {
  const body = {
    version: 'defaults',
    updated_at: null,
    meal_types: [],
    app_versions: {},
    update: { status: 'none' as const },
    support: {},
    ordering: {},
    feature_flags: {},
  }

  function controller() {
    const getAppSettings = jest.fn().mockResolvedValue(body)
    return {
      getAppSettings,
      controller: new AppSettingsController({
        queries: { getAppSettings },
      } as unknown as UseCases),
    }
  }

  it('is public and sets a 5 minute cache plus an etag', async () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AppSettingsController)).toBeUndefined()
    const { controller: http, getAppSettings } = controller()
    const res = mockRes()
    const result = await http.getSettings(
      { platform: 'ios', app_version: '1.0.0' },
      { headers: {} } as Request,
      res as unknown as Response
    )

    expect(getAppSettings).toHaveBeenCalledWith({
      platform: 'ios',
      appVersion: '1.0.0',
    })
    expect(result).toEqual(body)
    expect(res.headers['cache-control']).toBe('public, max-age=300')
    expect(res.headers.etag).toMatch(/^"[0-9a-f]{40}"$/)
  })

  it('returns 304 when If-None-Match matches the etag', async () => {
    const { controller: http } = controller()
    const first = mockRes()
    await http.getSettings({}, { headers: {} } as Request, first as unknown as Response)

    const second = mockRes()
    const result = await http.getSettings(
      {},
      { headers: { 'if-none-match': first.headers.etag } } as unknown as Request,
      second as unknown as Response
    )

    expect(second.statusCode).toBe(304)
    expect(result).toBeUndefined()
    expect(second.headers['cache-control']).toBe('public, max-age=300')
  })
})
