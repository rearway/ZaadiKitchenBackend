import { Deps } from '../../entitygateway/index.js'

export interface GetMealPhotoUploadUrlInput {
  mealId: string
  contentType: string
}

export interface GetMealPhotoUploadUrlOutput {
  upload_url: string
  photo_url: string
  expires_in_seconds: number
}

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PRESIGN_EXPIRY_SECONDS = 300

export function makeUC(deps: Deps) {
  return async function getMealPhotoUploadUrl(
    input: GetMealPhotoUploadUrlInput
  ): Promise<GetMealPhotoUploadUrlOutput> {
    const { logger, mealLoader, storageGateway } = deps
    try {
      const { mealId, contentType } = input

      if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
        const { ValidationError } = await import('../../../shared/errors/index.js')
        throw new ValidationError(
          `Unsupported content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`
        )
      }

      const meal = await mealLoader.getMealById(mealId)
      if (!meal) {
        const { ResourceNotFoundError } = await import('../../../shared/errors/index.js')
        throw new ResourceNotFoundError('Meal')
      }

      const ext = contentType.split('/')[1]
      const key = `meals/${mealId}/photo.${ext}`
      const uploadUrl = await storageGateway.getPresignedUploadUrl(key, contentType, PRESIGN_EXPIRY_SECONDS)
      const photoUrl = storageGateway.getPublicUrl(key)

      return {
        upload_url: uploadUrl,
        photo_url: photoUrl,
        expires_in_seconds: PRESIGN_EXPIRY_SECONDS,
      }
    } catch (error) {
      logger.error(
        'Failed to generate meal photo upload URL',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GetMealPhotoUploadUrl'
