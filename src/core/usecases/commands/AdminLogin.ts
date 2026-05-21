import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { Deps } from '../../entitygateway/index.js'
import { UserWithoutPassword } from '../../entities/index.js'
import { UserRole } from '../../../codecs/enums.js'

export interface AdminLoginInput {
  email: string
  password: string
  userAgent?: string
  ipAddress?: string
}

export type AdminLoginOutput = {
  message: string
  data: {
    user: UserWithoutPassword
    accessToken: string
    refreshToken: string
  }
}

export function makeUC(deps: Deps) {
  return async function adminLogin(
    input: AdminLoginInput
  ): Promise<AdminLoginOutput> {
    const {
      logger,
      userLoader,
      refreshTokenPersistor,
      jwtSecret,
      jwtAccessExpiration,
      jwtRefreshExpirationAdmin,
    } = deps

    try {
      const { email, password, userAgent, ipAddress } = input

      // Find admin user by email
      const user = await userLoader.getUserByEmail(email)

      if (
        !user ||
        (user.role !== UserRole.ADMIN && user.role !== UserRole.OPS)
      ) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Invalid email or password')
      }

      if (!user.password) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Invalid email or password')
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password)

      if (!isPasswordValid) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Invalid email or password')
      }

      // Check if user is active
      if (!user.isActive) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError(
          'Account is deactivated. Please contact support.'
        )
      }

      // Generate JWT access token
      const accessToken = jwt.sign(
        { sub: user.id, role: user.role, email: user.email },
        jwtSecret as jwt.Secret,
        { expiresIn: jwtAccessExpiration }
      )

      // Generate refresh token with shorter expiry for admin (8h)
      const refreshTokenValue = crypto.randomUUID()
      const refreshExpiresAt = parseExpiration(jwtRefreshExpirationAdmin)

      await refreshTokenPersistor.createToken({
        userId: user.id,
        token: refreshTokenValue,
        expiresAt: refreshExpiresAt,
        userAgent,
        ipAddress,
      })

      // Strip password from user response
      const { password: _, ...userWithoutPassword } = user

      return {
        message: 'Admin logged in successfully',
        data: {
          user: userWithoutPassword,
          accessToken,
          refreshToken: refreshTokenValue,
        },
      }
    } catch (error) {
      logger.error(
        'Failed admin login',
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
    return new Date(now + 8 * 60 * 60 * 1000)
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
      return new Date(now + 8 * 60 * 60 * 1000)
  }
}

export const name = 'AdminLogin'
