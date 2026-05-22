import type { CheckoutSession } from '../entities/CheckoutSession.js'

export interface CheckoutSessionLoader {
  getSessionById(id: string): Promise<CheckoutSession | null>
  getActiveSessionByUserId(userId: string): Promise<CheckoutSession | null>
}

export interface CheckoutSessionPersistor {
  createSession(
    input: Omit<CheckoutSession, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<CheckoutSession>
  updateSession(
    id: string,
    updates: Partial<CheckoutSession>
  ): Promise<CheckoutSession>
  expireAllUserSessions(userId: string): Promise<void>
}
