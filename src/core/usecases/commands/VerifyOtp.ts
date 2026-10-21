import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { Deps } from '../../entitygateway/index.js'
import { UserRole } from '../../../codecs/enums.js'
import { UserWithoutPassword } from '../../entities/index.js'
import { getReviewOtpCode } from '../services/otpReviewUtils.js'

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
      deliveryLocationLoader,
      jwtSecret,
      jwtRefreshExpirationMobile,
    } = deps

    try {
      const { phone, code, userAgent, ipAddress } = input
      const reviewFixedCode = getReviewOtpCode(phone)
      const reviewCodeAccepted =
        reviewFixedCode !== null && code === reviewFixedCode

      const session = await otpSessionLoader.getActiveSession(phone)

      if (!reviewCodeAccepted) {
        if (!session) {
          const { OtpExpiredError } =
            await import('../../../shared/errors/index.js')
          throw new OtpExpiredError()
        }

        if (session.code !== code) {
          await otpSessionPersistor.incrementAttempt(session.id)

          const { OtpInvalidError } =
            await import('../../../shared/errors/index.js')
          throw new OtpInvalidError()
        }

        if (new Date() > session.expiresAt) {
          const { OtpExpiredError } =
            await import('../../../shared/errors/index.js')
          throw new OtpExpiredError()
        }

        await otpSessionPersistor.markVerified(session.id)
      } else if (session) {
        await otpSessionPersistor.markVerified(session.id)
      }

      let user = await userLoader.getUserByPhone(phone)
      let isNewUser = false

      if (!user) {
        isNewUser = true
        user = await userPersistor.createUser({
          phone,
          fullName: 'New User',
          role: UserRole.CUSTOMER,
        })
      } else if (user.role === UserRole.DRIVER) {
        // Driver already exists — just log them in
      } else if (user.role === UserRole.ADMIN || user.role === UserRole.OPS) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError(
          'Admin and Ops accounts must use email and password to log in.'
        )
      }

      if (!user.isActive) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError(
          'Account is deactivated. Please contact support.'
        )
      }

      const accessToken = jwt.sign(
        { sub: user.id, role: user.role, phone: user.phone },
        jwtSecret as jwt.Secret,
        { expiresIn: '36500d' }
      )

      const refreshTokenValue = crypto.randomUUID()
      const refreshExpiresAt = parseExpiration(jwtRefreshExpirationMobile)

      await refreshTokenPersistor.createToken({
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
        userAgent,
        ipAddress,
      })

      const { password: _, ...userWithoutPassword } = user

      const primaryLocation =
        await deliveryLocationLoader.getPrimaryLocationByUserId(user.id)
      const onboardingComplete = primaryLocation !== null

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
          accessExpiresIn: 36500 * 24 * 60 * 60,
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
