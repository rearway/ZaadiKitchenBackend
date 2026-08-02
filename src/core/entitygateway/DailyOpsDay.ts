import type { DailyOpsDay } from '../entities/DailyOpsDay.js'

export interface DailyOpsDayLoader {
  getByDate(date: string): Promise<DailyOpsDay | null>
}

export interface DailyOpsDayPersistor {
  advanceStage(
    date: string,
    toStage: 'dispatch' | 'delivered',
    advancedByUserId: string
  ): Promise<DailyOpsDay>
}
