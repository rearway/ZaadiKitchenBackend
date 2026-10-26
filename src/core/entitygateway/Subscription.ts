import type { Subscription } from '../entities/Subscription.js'

export interface SubscriptionLoader {
  getActiveSubscriptionByUserId(userId: string): Promise<Subscription | null>
  /** Newest row of any status. Used only when no active, paused, or cancelled row exists. */
  getLatestSubscriptionByUserId?(userId: string): Promise<Subscription | null>
  getSubscriptionById(id: string): Promise<Subscription | null>
}

export interface SubscriptionPersistor {
  createSubscription(
    input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Subscription>
  updateSubscription(
    id: string,
    updates: Partial<Subscription>
  ): Promise<Subscription>
  expireActiveSubscriptions(beforeDate: string): Promise<number>
}
