import { Deps } from '../../entitygateway/index.js'

export interface ExpireSubscriptionsInput {
  asOfDate?: string
}

export interface ExpireSubscriptionsOutput {
  expired_count: number
  as_of_date: string
}

function todayKSA(): string {
  // KSA is UTC+3; get today's date in KSA timezone
  const now = new Date()
  const ksa = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }))
  const y = ksa.getFullYear()
  const m = String(ksa.getMonth() + 1).padStart(2, '0')
  const d = String(ksa.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function makeUC(deps: Deps) {
  return async function expireSubscriptions(
    input: ExpireSubscriptionsInput
  ): Promise<ExpireSubscriptionsOutput> {
    const { logger, subscriptionPersistor } = deps
    try {
      const asOfDate = input.asOfDate ?? todayKSA()

      const expiredCount = await subscriptionPersistor.expireActiveSubscriptions(asOfDate)

      logger.log(`ExpireSubscriptions: expired ${expiredCount} subscription(s) as of ${asOfDate}`)

      return { expired_count: expiredCount, as_of_date: asOfDate }
    } catch (error) {
      logger.error(
        'Failed to expire subscriptions',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'ExpireSubscriptions'
