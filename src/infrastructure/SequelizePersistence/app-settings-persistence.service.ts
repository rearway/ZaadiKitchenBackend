import { Injectable } from '@nestjs/common'

import type { AppSettingsLoader } from '../../core/entitygateway/AppSettings.js'
import type { AppSetting } from '../../core/entities/AppSetting.js'
import { AppSettingModel } from './models/AppSettingModel.js'

export function isMissingAppSettingsTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as {
    parent?: { code?: string }
    original?: { code?: string }
  }
  const code = candidate.parent?.code ?? candidate.original?.code
  return code === '42P01'
}

@Injectable()
export class AppSettingsPersistenceService implements AppSettingsLoader {
  async getAll(): Promise<AppSetting[]> {
    try {
      const rows = await AppSettingModel.findAll()
      return rows.map(row => ({
        key: row.key,
        value: row.value,
        updatedBy: row.updatedBy ?? null,
        updatedAt: row.updatedAt,
      }))
    } catch (error) {
      if (isMissingAppSettingsTable(error)) return []
      throw error
    }
  }
}
