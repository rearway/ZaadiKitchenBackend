export interface StorageGateway {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<string>
  getPublicUrl(key: string): string
}
