import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { Deps } from '../../entitygateway/index.js'
import { UserRole } from '../../../codecs/enums.js'
import { UserWithoutPassword } from '../../entities/index.js'

export interface VerifyOtpInput {
  phone: string
  code: string
  userAgent?: string
  ipAddress?: string
}

export type VerifyOtpOutput = {
  message: string
  data: {
    user: UserWithoutPassword & { onboardingComplete: boolean }
    accessToken: string
    refreshToken: string
    tokenType: string
    accessExpiresIn: number
    refreshExpiresIn: number
    isNewUser: boolean
  }
}

export function makeUC(deps: Deps) {
  return async function verifyOtp(
    input: VerifyOtpInput
  ): Promise<VerifyOtpOutput> {
    const {
      logger,
      otpSessionLoader,
      otpSessionPersistor,
      userLoader,
      userPersistor,
      refreshTokenPersistor,
      jwtSecret,
      jwtRefreshExpirationMobile,
    } = deps

    try {
      const { phone, code, userAgent, ipAddress } = input

      // Get active OTP session
      const session = await otpSessionLoader.getActiveSession(phone)

      if (!session) {
        const { OtpExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new OtpExpiredError()
      }

      // Check if OTP matches
      if (session.code !== code) {
        await otpSessionPersistor.incrementAttempt(session.id)

        const { OtpInvalidError } =
          await import('../../../shared/errors/index.js')
        throw new OtpInvalidError()
      }

      // Check if OTP has expired
      if (new Date() > session.expiresAt) {
        const { OtpExpiredError } =
          await import('../../../shared/errors/index.js')
        throw new OtpExpiredError()
      }

      // Mark OTP as verified
      await otpSessionPersistor.markVerified(session.id)

      // Look up existing user
      let user = await userLoader.getUserByPhone(phone)
      let isNewUser = false

      if (!user) {
        // Only CUSTOMER can self-register via OTP.
        // DRIVER accounts are pre-created manually in the DB.
        isNewUser = true
        user = await userPersistor.createUser({
          phone,
          fullName: 'New User', // Will be updated in profile step
          role: UserRole.CUSTOMER,
        })
      } else if (user.role === UserRole.DRIVER) {
        // Driver already exists — just log them in, no changes needed.
        // If somehow a DRIVER doesn't exist, they cannot self-register.
      } else if (user.role === UserRole.ADMIN || user.role === UserRole.OPS) {
        // Admin/Ops must use email+password login, not OTP.
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError(
          'Admin and Ops accounts must use email and password to log in.'
        )
      }

      // Check if user is active
      if (!user.isActive) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError(
          'Account is deactivated. Please contact support.'
        )
      }

      // Generate JWT access token — 100-year expiry for mobile forever session
      const accessToken = jwt.sign(
        { sub: user.id, role: user.role, phone: user.phone },
        jwtSecret as jwt.Secret,
        { expiresIn: '36500d' }
      )

      // Generate refresh token
      const refreshTokenValue = crypto.randomUUID()
      const refreshExpiresAt = parseExpiration(jwtRefreshExpirationMobile)

      await refreshTokenPersistor.createToken({
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
        userAgent,
        ipAddress,
      })

      // Strip password from user response
      const { password: _, ...userWithoutPassword } = user

      // Determine onboarding complete logic
      // For now, if it's a new user, onboarding is not complete.
      // Real logic checks if they have a saved delivery location.
      const onboardingComplete = !isNewUser

      return {
        message: isNewUser
          ? 'Account created and logged in successfully'
          : 'Logged in successfully',
        data: {
          user: {
            ...userWithoutPassword,
            onboardingComplete,
          },
          accessToken,
          refreshToken: refreshTokenValue,
          tokenType: 'Bearer',
          accessExpiresIn: 36500 * 24 * 60 * 60, // 100 years in seconds
          refreshExpiresIn: parseExpirationSeconds(jwtRefreshExpirationMobile),
          isNewUser,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to verify OTP',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

function parseExpiration(expiration: string): Date {
  const now = Date.now()
  const match = expiration.match(/^(\d+)([smhd])$/)

  if (!match) {
    return new Date(now + 30 * 24 * 60 * 60 * 1000)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return new Date(now + value * 1000)
    case 'm':
      return new Date(now + value * 60 * 1000)
    case 'h':
      return new Date(now + value * 60 * 60 * 1000)
    case 'd':
      return new Date(now + value * 24 * 60 * 60 * 1000)
    default:
      return new Date(now + 30 * 24 * 60 * 60 * 1000)
  }
}

function parseExpirationSeconds(expiration: string): number {
  const match = expiration.match(/^(\d+)([smhd])$/)
  if (!match) return 30 * 24 * 60 * 60

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 's':
      return value
    case 'm':
      return value * 60
    case 'h':
      return value * 60 * 60
    case 'd':
      return value * 24 * 60 * 60
    default:
      return 30 * 24 * 60 * 60
  }
}

export const name = 'VerifyOtp'
