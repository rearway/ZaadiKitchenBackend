import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'

import { OtpSession } from '../../core/entities/index.js'
import {
    OtpSessionLoader,
    OtpSessionPersistor,
    CreateOtpSessionRequest,
} from '../../core/entitygateway/OtpSession.js'
import { OtpSessionModel } from './models/index.js'

@Injectable()
export class OtpSessionPersistenceService
    implements OtpSessionLoader, OtpSessionPersistor {
    async getActiveSession(phone: string): Promise<OtpSession | null> {
        const model = await OtpSessionModel.findOne({
            where: {
                phone,
                isVerified: false,
                expiresAt: { [Op.gt]: new Date() },
            },
            order: [['createdAt', 'DESC']],
        })
        console.log('model is ', model)
        return model ? this.toEntity(model) : null
    }

    async getRecentAttemptCount(
        phone: string,
        windowMinutes: number
    ): Promise<number> {
        const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)
        const count = await OtpSessionModel.count({
            where: {
                phone,
                createdAt: { [Op.gte]: windowStart },
            },
        })
        return count
    }

    async getLockedSession(phone: string): Promise<OtpSession | null> {
        const model = await OtpSessionModel.findOne({
            where: {
                phone,
                lockedUntil: { [Op.gt]: new Date() },
            },
            order: [['lockedUntil', 'DESC']],
        })
        return model ? this.toEntity(model) : null
    }

    async createSession(
        request: CreateOtpSessionRequest
    ): Promise<OtpSession> {
        const model = await OtpSessionModel.create({
            phone: request.phone,
            code: request.code,
            expiresAt: request.expiresAt,
            attemptCount: 0,
            isVerified: false,
        })
        return this.toEntity(model)
    }

    async markVerified(sessionId: string): Promise<void> {
        await OtpSessionModel.update(
            { isVerified: true },
            { where: { id: sessionId } }
        )
    }

    async incrementAttempt(sessionId: string): Promise<void> {
        const model = await OtpSessionModel.findByPk(sessionId)
        if (model) {
            await model.increment('attemptCount')
        }
    }

    async lockPhone(phone: string, lockedUntil: Date): Promise<void> {
        // Update the most recent session for this phone with the lock
        const latestSession = await OtpSessionModel.findOne({
            where: { phone },
            order: [['createdAt', 'DESC']],
        })
        if (latestSession) {
            await latestSession.update({ lockedUntil })
        }
    }

    private toEntity(model: OtpSessionModel): OtpSession {
        return {
            id: model.id,
            phone: model.phone,
            code: model.code,
            attemptCount: model.attemptCount,
            isVerified: model.isVerified,
            expiresAt: model.expiresAt,
            lockedUntil: model.lockedUntil || undefined,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
        }
    }
}
