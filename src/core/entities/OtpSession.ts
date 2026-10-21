import type { OtpChannel } from '../../shared/otp/otpConstants.js'

export interface OtpSession {
  id: string
  phone: string
  channel: OtpChannel
  code: string
  attemptCount: number
  isVerified: boolean
  expiresAt: Date
  lockedUntil?: Date
  createdAt: Date
  updatedAt: Date
}
