import { Deps } from '../../entitygateway/index.js'
import { UserWithoutPassword } from '../../entities/index.js'

export interface UpdateProfileInput {
  userId: string
  fullName?: string
  email?: string
}

export type UpdateProfileOutput = {
  message: string
  data: UserWithoutPassword & { onboardingComplete: boolean }
}

export function makeUC(deps: Deps) {
  return async function updateProfile(
    input: UpdateProfileInput
  ): Promise<UpdateProfileOutput> {
    const { logger, userPersistor, referralPersistor } = deps
    try {
      const { userId, fullName, email } = input

      // Basic validation
      if (fullName && fullName.length < 2) {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('Name must be at least 2 characters', {
          fields: { name: 'Name must be at least 2 characters' },
        })
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          const { ValidationError } =
            await import('../../../shared/errors/index.js')
          throw new ValidationError('Email format is invalid', {
            fields: { email: 'Email format is invalid' },
          })
        }
      }

      const updatedUser = await userPersistor.updateUser(userId, {
        fullName,
        email,
      })

      // Eagerly generate the referral code when the user sets a real name so
      // it's ready before they ever visit the referral screen.
      if (updatedUser.fullName && updatedUser.fullName !== 'New User') {
        await referralPersistor.ensureReferralCode(userId, updatedUser.fullName)
      }

      const { password: _, ...userWithoutPassword } = updatedUser

      const onboardingComplete =
        !!updatedUser.fullName && updatedUser.fullName !== 'New User'

      return {
        message: 'Profile updated successfully',
        data: {
          ...userWithoutPassword,
          onboardingComplete,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to update profile',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdateProfile'
