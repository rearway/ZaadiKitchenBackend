import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'
import { isForcePipelineLockEnabled } from '../../core/usecases/services/forcePipelineLock.js'

/**
 * Hides the staging force-lock route unless the env gate is on.
 * Runs before body validation so a disabled or production process answers 404
 * and does not touch pipeline state.
 */
@Injectable()
export class ForcePipelineLockEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!isForcePipelineLockEnabled()) {
      throw new NotFoundException()
    }
    return true
  }
}
