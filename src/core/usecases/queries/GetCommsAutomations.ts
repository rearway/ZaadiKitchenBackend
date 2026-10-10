import type { Deps } from '../../entitygateway/index.js'
import { AUTOMATION_DEFINITIONS } from '../services/commsUtils.js'

export function makeUC(deps: Deps) {
  return async function getCommsAutomations() {
    const { commsLoader } = deps
    const states = await commsLoader.getAutomationStates()
    const stateById = new Map(states.map(s => [s.id, s]))

    return {
      data: {
        automations: AUTOMATION_DEFINITIONS.map(def => {
          const state = stateById.get(def.id)
          return {
            id: def.id,
            name: def.name,
            description: def.description,
            icon: def.icon,
            is_enabled: state?.isEnabled ?? def.defaultEnabled,
            channel: 'push' as const,
          }
        }),
        as_of: new Date().toISOString(),
      },
    }
  }
}

export const name = 'GetCommsAutomations'
