export interface RefreshToken {
    id: string
    userId: string
    token: string
    expiresAt: Date
    isRevoked: boolean
    userAgent?: string
    ipAddress?: string
    createdAt: Date
    updatedAt: Date
}
