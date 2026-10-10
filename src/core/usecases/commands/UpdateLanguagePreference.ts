import { Deps } from '../../entitygateway/index.js'

export interface UpdateLanguagePreferenceInput {
  userId: string
  language: 'EN' | 'AR'
}

export type UpdateLanguagePreferenceOutput = {
  message: string
  data: {
    language: 'EN' | 'AR'
  }
}

export function makeUC(deps: Deps) {
  return async function updateLanguagePreference(
    input: UpdateLanguagePreferenceInput
  ): Promise<UpdateLanguagePreferenceOutput> {
    const { logger, userPersistor } = deps
    try {
      const { userId, language } = input

      if (language !== 'EN' && language !== 'AR') {
        const { ValidationError } =
          await import('../../../shared/errors/index.js')
        throw new ValidationError('UNSUPPORTED_LANGUAGE', {
          fields: { language: 'Only EN and AR are supported' },
        })
      }

      await userPersistor.updateUser(userId, {
        languagePreference: language,
      })

      return {
        message: 'Language preference updated successfully',
        data: {
          language,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to update language preference',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'UpdateLanguagePreference'
