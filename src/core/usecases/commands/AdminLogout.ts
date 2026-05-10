import { Deps } from '../../entitygateway/index.js'

export interface AdminLogoutInput {
    userId: string
}

export type AdminLogoutOutput = {
    message: string
}

export function makeUC(deps: Deps) {
    return async function adminLogout(
        input: AdminLogoutInput
    ): Promise<AdminLogoutOutput> {
        const { logger, refreshTokenPersistor } = deps

        try {
            const { userId } = input

            // Revoke ALL refresh tokens for this admin user
            await refreshTokenPersistor.revokeAllUserTokens(userId)

            return {
                message: 'All admin sessions terminated successfully',
            }
        } catch (error) {
            logger.error(
                'Failed admin logout',
                error instanceof Error ? error.message : String(error)
            )
            throw error
        }
    }
}

export const name = 'AdminLogout'
