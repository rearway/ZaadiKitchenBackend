export interface OtpSession {
  id: string
  phone: string
  code: string
  attemptCount: number
  isVerified: boolean
  expiresAt: Date
  lockedUntil?: Date
  createdAt: Date
  updatedAt: Date
}
