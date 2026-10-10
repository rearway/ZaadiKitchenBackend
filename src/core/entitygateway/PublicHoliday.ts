import type { PublicHoliday } from '../entities/PublicHoliday.js'

export interface PublicHolidayLoader {
  getHolidaysByYear(year: number): Promise<PublicHoliday[]>
  getHolidayDates(from: string, to: string): Promise<string[]>
}

export interface PublicHolidayPersistor {
  createHoliday(
    input: Omit<PublicHoliday, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PublicHoliday>
}
