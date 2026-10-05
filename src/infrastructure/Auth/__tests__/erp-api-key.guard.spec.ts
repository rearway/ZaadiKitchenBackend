import { UnauthorizedException } from '@nestjs/common'
import { ErpApiKeyGuard } from '../erp-api-key.guard.js'

describe('ErpApiKeyGuard', () => {
  const guard = new ErpApiKeyGuard()
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
  })

  function contextWith(headers: Record<string, string>) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as Parameters<ErpApiKeyGuard['canActivate']>[0]
  }

  it('rejects when ERP_API_KEY is not configured', () => {
    process.env = { ...originalEnv, ERP_API_KEY: '' }
    expect(() => guard.canActivate(contextWith({ authorization: 'ApiKey secret' }))).toThrow(
      UnauthorizedException
    )
  })

  it('accepts Authorization: ApiKey header', () => {
    process.env = { ...originalEnv, ERP_API_KEY: 'test-key' }
    expect(guard.canActivate(contextWith({ authorization: 'ApiKey test-key' }))).toBe(true)
  })

  it('accepts X-Api-Key header', () => {
    process.env = { ...originalEnv, ERP_API_KEY: 'test-key' }
    expect(guard.canActivate(contextWith({ 'x-api-key': 'test-key' }))).toBe(true)
  })

  it('rejects invalid key', () => {
    process.env = { ...originalEnv, ERP_API_KEY: 'test-key' }
    expect(() => guard.canActivate(contextWith({ 'x-api-key': 'wrong' }))).toThrow(
      UnauthorizedException
    )
  })
})
