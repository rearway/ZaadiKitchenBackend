import type { Deps } from '../../entitygateway/index.js'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors.js'
import {
  AUTOMATION_DEFINITIONS,
  isValidAutomationId,
  type AutomationId,
} from '../services/commsUtils.js'

export interface UpdateCommsAutomationInput {
  automationId: string
  isEnabled: boolean
  adminUserId: string
}

export function makeUC(deps: Deps) {
  return async function updateCommsAutomation(input: UpdateCommsAutomationInput) {
    const { commsPersistor } = deps

    if (!isValidAutomationId(input.automationId)) {
      throw new ResourceNotFoundError('Automation', input.automationId)
    }

    const automationId = input.automationId as AutomationId
    const updated = await commsPersistor.setAutomationEnabled(
      automationId,
      input.isEnabled,
      input.adminUserId
    )
    const def = AUTOMATION_DEFINITIONS.find(d => d.id === automationId)!

    return {
      data: {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        is_enabled: updated.isEnabled,
        channel: 'push' as const,
        updated_at: updated.updatedAt?.toISOString() ?? new Date().toISOString(),
        updated_by_user_id: updated.updatedByUserId,
      },
    }
  }
}

export const name = 'UpdateCommsAutomation'
