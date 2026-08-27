import { Injectable } from '@nestjs/common'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageGateway } from '../../core/entitygateway/Storage.js'

@Injectable()
export class S3StorageService implements StorageGateway {
  private readonly s3: S3Client
  private readonly bucket: string
  private readonly region: string

  constructor() {
    this.region = process.env.AWS_REGION ?? 'ap-south-1'
    this.bucket = process.env.S3_BUCKET_NAME ?? ''
    this.s3 = new S3Client({ region: this.region })
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresInSeconds: number): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    })
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds })
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`
  }

  async uploadPublicFile(file: import('../../core/entitygateway/Storage.js').FileData, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimeType,
      // ACL: 'public-read' // Only if bucket supports ACLs, else rely on bucket policy
    })
    await this.s3.send(command)
    return this.getPublicUrl(key)
  }
}
