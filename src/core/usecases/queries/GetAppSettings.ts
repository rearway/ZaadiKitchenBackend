import type { Deps } from '../../entitygateway/index.js'
import {
  buildAppSettingsResponse,
  type AppSettingsResponse,
} from '../services/appSettingsPayload.js'

export interface GetAppSettingsInput {
  platform?: string
  appVersion?: string
}

export function makeUC(deps: Deps) {
  return async function getAppSettings(
    input: GetAppSettingsInput = {}
  ): Promise<AppSettingsResponse> {
    const { logger, appSettingsLoader } = deps
    try {
      const rows = await appSettingsLoader.getAll()
      return buildAppSettingsResponse(rows, input)
    } catch (error) {
      logger.error(
        'GetAppSettings failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetAppSettings'
