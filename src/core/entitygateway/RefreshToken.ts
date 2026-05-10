import { RefreshToken } from '../entities'

export interface RefreshTokenLoader {
    getByToken(token: string): Promise<RefreshToken | null>
    getActiveTokensByUserId(userId: string): Promise<RefreshToken[]>
}

export interface CreateRefreshTokenRequest {
    userId: string
    token: string
    expiresAt: Date
    userAgent?: string
    ipAddress?: string
}

export interface RefreshTokenPersistor {
    createToken(request: CreateRefreshTokenRequest): Promise<RefreshToken>
    revokeToken(tokenId: string): Promise<void>
    revokeAllUserTokens(userId: string): Promise<void>
}
