import { Deps } from '../../entitygateway/index.js'
import { MealType } from '../../entities/index.js'

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

// After 6 PM KSA (15:00 UTC), effective from day after next
function getEffectiveFrom(): string {
  const now = new Date()
  const ksaHour = (now.getUTCHours() + 3) % 24
  const addDaysCount = ksaHour >= 18 ? 2 : 1
  const result = new Date(now)
  result.setUTCDate(result.getUTCDate() + addDaysCount)
  const y = result.getUTCFullYear()
  const m = String(result.getUTCMonth() + 1).padStart(2, '0')
  const d = String(result.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

      const effectiveFrom = getEffectiveFrom()

      await deliveryDayPersistor.updateMealTypeForSubscription(
        subscription.id,
        mealType,
        effectiveFrom,
        applyTo === 'specific' ? specificDays : undefined
      )

      if (applyTo === 'all') {
        await subscriptionPersistor.updateSubscription(subscription.id, {
          mealType,
        })
      }

      const mealTypeName = mealType === 'executive' ? 'Executive' : 'Salad'
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
