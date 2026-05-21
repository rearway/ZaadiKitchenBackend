import { OtpSession } from '../entities'

export interface OtpSessionLoader {
  getActiveSession(phone: string): Promise<OtpSession | null>
  getRecentAttemptCount(phone: string, windowMinutes: number): Promise<number>
  getLockedSession(phone: string): Promise<OtpSession | null>
}

export interface CreateOtpSessionRequest {
  phone: string
  code: string
  expiresAt: Date
}

export interface OtpSessionPersistor {
  createSession(request: CreateOtpSessionRequest): Promise<OtpSession>
  markVerified(sessionId: string): Promise<void>
  incrementAttempt(sessionId: string): Promise<void>
  lockPhone(phone: string, lockedUntil: Date): Promise<void>
}
