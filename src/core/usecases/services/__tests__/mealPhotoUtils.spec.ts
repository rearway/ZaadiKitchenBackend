describe('mealPhotoUtils', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, AWS_REGION: 'ap-south-1', S3_BUCKET_NAME: 'test-bucket' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns stored absolute URLs unchanged', async () => {
    const { resolveMealPhotoUrl } = await import('../mealPhotoUtils.js')
    expect(resolveMealPhotoUrl('https://cdn.example.com/a.jpg', 'meal-1')).toBe(
      'https://cdn.example.com/a.jpg'
    )
  })

  it('builds a public URL from an S3 key', async () => {
    const { resolveMealPhotoUrl } = await import('../mealPhotoUtils.js')
    expect(resolveMealPhotoUrl('meals/meal-1/photo.png', 'meal-1')).toBe(
      'https://test-bucket.s3.ap-south-1.amazonaws.com/meals/meal-1/photo.png'
    )
  })

  it('falls back to the canonical meal photo path when DB photo_url is null', async () => {
    const { resolveMealPhotoUrl } = await import('../mealPhotoUtils.js')
    expect(resolveMealPhotoUrl(null, 'meal-1')).toBe(
      'https://test-bucket.s3.ap-south-1.amazonaws.com/meals/meal-1/photo.jpeg'
    )
  })

  it('returns null when there is no stored URL and no meal id', async () => {
    const { resolveMealPhotoUrl } = await import('../mealPhotoUtils.js')
    expect(resolveMealPhotoUrl(null, null)).toBeNull()
  })
})
