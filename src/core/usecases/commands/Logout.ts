import { Deps } from '../../entitygateway/index.js'

export interface LogoutInput {
  refreshToken: string
}

export type LogoutOutput = {
  message: string
}

export function makeUC(deps: Deps) {
  return async function logout(input: LogoutInput): Promise<LogoutOutput> {
    const { logger, refreshTokenLoader, refreshTokenPersistor } = deps

    try {
      const { refreshToken } = input

      // Find the refresh token
      const tokenRecord = await refreshTokenLoader.getByToken(refreshToken)

      if (tokenRecord && !tokenRecord.isRevoked) {
        // Revoke only this specific token (current session only)
        await refreshTokenPersistor.revokeToken(tokenRecord.id)
      }

      return {
        message: 'Logged out successfully',
      }
    } catch (error) {
      logger.error(
        'Failed to logout',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'Logout'
