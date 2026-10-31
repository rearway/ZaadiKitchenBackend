import type { AppSetting } from '../entities/AppSetting.js'

export interface AppSettingsLoader {
  getAll(): Promise<AppSetting[]>
}
