import { Deps } from '../../entitygateway/index.js'

export interface GetPublicHolidaysInput {
  userId: string
  year?: number
}

export interface GetPublicHolidaysOutput {
  holidays: Array<{
    date: string
    name: string
  }>
}

export function makeUC(deps: Deps) {
  return async function getPublicHolidays(
    input: GetPublicHolidaysInput
  ): Promise<GetPublicHolidaysOutput> {
    const { logger, publicHolidayLoader } = deps
    try {
      const year = input.year ?? new Date().getFullYear()
      const holidays = await publicHolidayLoader.getHolidaysByYear(year)
      return {
        holidays: holidays.map(h => ({ date: h.date, name: h.name })),
      }
    } catch (error) {
      logger.error(
        'Failed to get public holidays',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetPublicHolidays'
