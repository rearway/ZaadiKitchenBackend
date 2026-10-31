import { Deps } from '../../entitygateway/index.js'
import { MealType } from '../../entities/index.js'
import { mealTypeNameEn } from '../../../shared/meal-display.js'
import { compareDateStrings } from '../services/weekUtils.js'
import { loadMealTypeDisplays } from '../services/mealDisplayNames.js'

export interface SwitchMealTypeInput {
  userId: string
  mealType: MealType
  applyTo: 'all' | 'specific'
  specificDays?: string[]
}

export interface SwitchMealTypeOutput {
  subscription_id: string
  meal_type: string
  applied_to: string
  effective_from: string
  message: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  const date = new Date(dateStr + 'T00:00:00Z')
  return `${DAYS[date.getUTCDay()]} ${d} ${MONTHS[m - 1]}`
}

/** After 18:00 KSA, earliest change is the day after next; otherwise tomorrow. */
export function getMealTypeEffectiveFrom(now: Date = new Date()): string {
  const ksaHour = (now.getUTCHours() + 3) % 24
  const addDaysCount = ksaHour >= 18 ? 2 : 1
  const result = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  result.setUTCDate(result.getUTCDate() + addDaysCount)
  return result.toISOString().slice(0, 10)
}

export function makeUC(deps: Deps) {
  return async function switchMealType(
    input: SwitchMealTypeInput
  ): Promise<SwitchMealTypeOutput> {
    const {
      logger,
      subscriptionLoader,
      subscriptionPersistor,
      deliveryDayPersistor,
    } = deps
    try {
      const { userId, mealType, applyTo, specificDays } = input

      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(userId)
      if (!subscription) {
        const { ResourceNotFoundError } =
          await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Subscription')
      }

      const effectiveFrom = getMealTypeEffectiveFrom()

      let datesToUpdate: string[] | undefined
      if (applyTo === 'specific') {
        const requested = [...new Set(specificDays ?? [])]
        if (requested.length === 0) {
          const { ValidationError } =
            await import('../../../shared/errors/index.js')
          throw new ValidationError(
            'Select at least one day to change the meal type.'
          )
        }
        const tooSoon = requested.filter(
          d => compareDateStrings(d, effectiveFrom) < 0
        )
        if (tooSoon.length > 0) {
          const { ValidationError } =
            await import('../../../shared/errors/index.js')
          throw new ValidationError(
            `Meal type can only change from ${formatShort(effectiveFrom)} onwards.`,
            {
              fields: {
                specific_days: `Earliest allowed date is ${effectiveFrom}.`,
                blocked_dates: tooSoon,
              },
            }
          )
        }
        datesToUpdate = requested
      }

      await deliveryDayPersistor.updateMealTypeForSubscription(
        subscription.id,
        mealType,
        effectiveFrom,
        datesToUpdate
      )

      if (applyTo === 'all') {
        await subscriptionPersistor.updateSubscription(subscription.id, {
          mealType,
        })
      }

      const displays = await loadMealTypeDisplays(deps.appSettingsLoader)
      const mealTypeName = mealTypeNameEn(mealType, displays)
      const message = `Meal type updated to ${mealTypeName} from ${formatShort(effectiveFrom)} onwards.`

      return {
        subscription_id: subscription.id,
        meal_type: mealType,
        applied_to: applyTo,
        effective_from: effectiveFrom,
        message,
      }
    } catch (error) {
      logger.error(
        'Failed to switch meal type',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'SwitchMealType'
