export interface FileData {
  buffer: Buffer
  mimeType: string
  fileName: string
}

export interface StorageGateway {
  getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number
  ): Promise<string>
  getPublicUrl(key: string): string
  uploadPublicFile(file: FileData, key: string): Promise<string>
}
