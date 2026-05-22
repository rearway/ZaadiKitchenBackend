import * as jwt from 'jsonwebtoken'

import { Deps } from '../../entitygateway/index.js'

export interface RefreshAccessTokenInput {
  refreshToken: string
}

export type RefreshAccessTokenOutput = {
  message: string
  data: {
    accessToken: string
  }
}

export function makeUC(deps: Deps) {
  return async function refreshAccessToken(
    input: RefreshAccessTokenInput
  ): Promise<RefreshAccessTokenOutput> {
    const {
      logger,
      refreshTokenLoader,
      userLoader,
      jwtSecret,
      jwtAccessExpiration,
    } = deps

    try {
      const { refreshToken } = input

      // Find the refresh token in DB
      const tokenRecord = await refreshTokenLoader.getByToken(refreshToken)

      if (!tokenRecord) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Invalid refresh token')
      }

      // Check if revoked
      if (tokenRecord.isRevoked) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Refresh token has been revoked')
      }

      // Check if expired
      if (new Date() > tokenRecord.expiresAt) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('Refresh token has expired')
      }

      // Get the user
      const user = await userLoader.getUserById(tokenRecord.userId)

      if (!user || !user.isActive) {
        const { AuthenticationError } =
          await import('../../../shared/errors/index.js')
        throw new AuthenticationError('User account not found or deactivated')
      }

      // Generate new access token
      const payload: Record<string, any> = {
        sub: user.id,
        role: user.role,
      }

      if (user.phone) payload.phone = user.phone
      if (user.email) payload.email = user.email

      const accessToken = jwt.sign(payload, jwtSecret as jwt.Secret, {
        expiresIn: jwtAccessExpiration as unknown as jwt.SignOptions['expiresIn'],
      })

      return {
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to refresh token',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'RefreshAccessToken'
