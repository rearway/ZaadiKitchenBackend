/** Canonical S3 key for admin meal photo uploads (see GetMealPhotoUploadUrl). */
export function mealPhotoObjectKey(mealId: string, ext = 'jpeg'): string {
  return `meals/${mealId}/photo.${ext}`
}

function mealPhotoBucketAndRegion(): { bucket: string; region: string } | null {
  const bucket = process.env.S3_BUCKET_NAME?.trim()
  if (!bucket) return null
  const region = process.env.AWS_REGION ?? 'ap-south-1'
  return { bucket, region }
}

export function buildMealPhotoPublicUrl(mealId: string, ext = 'jpeg'): string | null {
  const cfg = mealPhotoBucketAndRegion()
  if (!cfg) return null
  const key = mealPhotoObjectKey(mealId, ext)
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`
}

/** Returns a public URL from DB value, S3 key, or the standard meals/{id}/photo.jpeg path. */
export function resolveMealPhotoUrl(
  stored: string | null | undefined,
  mealId: string | null | undefined
): string | null {
  if (stored?.trim()) {
    const value = stored.trim()
    if (/^https?:\/\//i.test(value)) return value
    const cfg = mealPhotoBucketAndRegion()
    if (!cfg) return value
    const key = value.replace(/^\//, '')
    return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/${key}`
  }
  if (mealId) return buildMealPhotoPublicUrl(mealId)
  return null
}
