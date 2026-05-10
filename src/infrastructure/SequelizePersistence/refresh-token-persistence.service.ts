import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'

import { RefreshToken } from '../../core/entities/index.js'
import {
    RefreshTokenLoader,
    RefreshTokenPersistor,
    CreateRefreshTokenRequest,
} from '../../core/entitygateway/RefreshToken.js'
import { RefreshTokenModel } from './models/index.js'

@Injectable()
export class RefreshTokenPersistenceService
    implements RefreshTokenLoader, RefreshTokenPersistor {
    async getByToken(token: string): Promise<RefreshToken | null> {
        const model = await RefreshTokenModel.findOne({ where: { token } })
        return model ? this.toEntity(model) : null
    }

    async getActiveTokensByUserId(userId: string): Promise<RefreshToken[]> {
        const models = await RefreshTokenModel.findAll({
            where: {
                userId,
                isRevoked: false,
                expiresAt: { [Op.gt]: new Date() },
            },
        })
        return models.map(m => this.toEntity(m))
    }

    async createToken(
        request: CreateRefreshTokenRequest
    ): Promise<RefreshToken> {
        const model = await RefreshTokenModel.create({
            userId: request.userId,
            token: request.token,
            expiresAt: request.expiresAt,
            userAgent: request.userAgent || null,
            ipAddress: request.ipAddress || null,
            isRevoked: false,
        })
        return this.toEntity(model)
    }

    async revokeToken(tokenId: string): Promise<void> {
        await RefreshTokenModel.update(
            { isRevoked: true },
            { where: { id: tokenId } }
        )
    }

    async revokeAllUserTokens(userId: string): Promise<void> {
        await RefreshTokenModel.update(
            { isRevoked: true },
            { where: { userId, isRevoked: false } }
        )
    }

    private toEntity(model: RefreshTokenModel): RefreshToken {
        return {
            id: model.id,
            userId: model.userId,
            token: model.token,
            expiresAt: model.expiresAt,
            isRevoked: model.isRevoked,
            userAgent: model.userAgent || undefined,
            ipAddress: model.ipAddress || undefined,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
        }
    }
}
