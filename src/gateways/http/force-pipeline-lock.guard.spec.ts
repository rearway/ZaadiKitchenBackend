import { NotFoundException } from '@nestjs/common'
import { ForcePipelineLockEnabledGuard } from './force-pipeline-lock.guard.js'
import { resetForceLockedDeliveryDates } from '../../core/usecases/services/forcePipelineLock.js'

describe('ForcePipelineLockEnabledGuard', () => {
  const guard = new ForcePipelineLockEnabledGuard()
  const originalFlag = process.env.ALLOW_FORCE_PIPELINE_LOCK
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    resetForceLockedDeliveryDates()
    if (originalFlag === undefined) delete process.env.ALLOW_FORCE_PIPELINE_LOCK
    else process.env.ALLOW_FORCE_PIPELINE_LOCK = originalFlag
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  it('returns 404 when the flag is unset', () => {
    delete process.env.ALLOW_FORCE_PIPELINE_LOCK
    process.env.NODE_ENV = 'staging'
    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('returns 404 in production even when the flag is true', () => {
    process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
    process.env.NODE_ENV = 'production'
    expect(() => guard.canActivate()).toThrow(NotFoundException)
  })

  it('allows the request only when the flag is exactly true outside production', () => {
    process.env.ALLOW_FORCE_PIPELINE_LOCK = 'true'
    process.env.NODE_ENV = 'staging'
    expect(guard.canActivate()).toBe(true)
  })
})
