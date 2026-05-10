import * as jwt from 'jsonwebtoken'
import crypto from 'crypto'

import { Deps } from '../../entitygateway/index.js'
import { UserRole } from '../../../codecs/enums.js'
import { User, UserWithoutPassword } from '../../entities/index.js'

export interface VerifyOtpInput {
    phone: string
    code: string
    role: UserRole.CUSTOMER | UserRole.DRIVER
    fullName?: string
    userAgent?: string
    ipAddress?: string
}

export type VerifyOtpOutput = {
    message: string
    data: {
        user: UserWithoutPassword
        accessToken: string
        refreshToken: string
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
            jwtAccessExpiration,
            jwtRefreshExpirationMobile,
        } = deps

        try {
            const { phone, code, role, fullName, userAgent, ipAddress } = input

            // Get active OTP session
            const session = await otpSessionLoader.getActiveSession(phone)

            if (!session) {
                const { OtpExpiredError } = await import(
                    '../../../shared/errors/index.js'
                )
                throw new OtpExpiredError()
            }

            // Check if OTP matches
            if (session.code !== code) {
                // Increment attempt count
                await otpSessionPersistor.incrementAttempt(session.id)

                const { OtpInvalidError } = await import(
                    '../../../shared/errors/index.js'
                )
                throw new OtpInvalidError()
            }

            // Check if OTP has expired
            if (new Date() > session.expiresAt) {
                const { OtpExpiredError } = await import(
                    '../../../shared/errors/index.js'
                )
                throw new OtpExpiredError()
            }

            // Mark OTP as verified
            await otpSessionPersistor.markVerified(session.id)

            // Find or create user
            let user = await userLoader.getUserByPhone(phone)
            let isNewUser = false

            if (!user) {
                isNewUser = true
                user = await userPersistor.createUser({
                    phone,
                    fullName: fullName || 'User',
                    role,
                })
            }

            // Check if user is active
            if (!user.isActive) {
                const { AuthenticationError } = await import(
                    '../../../shared/errors/index.js'
                )
                throw new AuthenticationError(
                    'Account is deactivated. Please contact support.'
                )
            }

            // Generate JWT access token
            const accessToken = jwt.sign(
                { sub: user.id, role: user.role, phone: user.phone },
                jwtSecret as jwt.Secret,
                { expiresIn: jwtAccessExpiration as any }
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

            return {
                message: isNewUser
                    ? 'Account created and logged in successfully'
                    : 'Logged in successfully',
                data: {
                    user: userWithoutPassword as UserWithoutPassword,
                    accessToken,
                    refreshToken: refreshTokenValue,
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
        // Default to 30 days
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

export const name = 'VerifyOtp'
