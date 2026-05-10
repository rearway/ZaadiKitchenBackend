import { Injectable } from '@nestjs/common'
import { Op } from 'sequelize'

import { User } from '../../core/entities/index.js'
import { UserRole } from '../../codecs/enums.js'
import {
    UserLoader,
    UserPersistor,
    CreateUserRequest,
    UpdateUserRequest,
} from '../../core/entitygateway/User.js'
import { UserModel } from './models/index.js'

@Injectable()
export class UserPersistenceService implements UserLoader, UserPersistor {
    async getUserById(userId: string): Promise<User | null> {
        const model = await UserModel.findByPk(userId)
        return model ? this.toEntity(model) : null
    }

    async getUserByPhone(phone: string): Promise<User | null> {
        const model = await UserModel.findOne({ where: { phone } })
        return model ? this.toEntity(model) : null
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const model = await UserModel.findOne({ where: { email } })
        return model ? this.toEntity(model) : null
    }

    async createUser(request: CreateUserRequest): Promise<User> {
        const model = await UserModel.create({
            phone: request.phone || null,
            email: request.email || null,
            password: request.password || null,
            fullName: request.fullName,
            role: request.role,
            languagePreference: request.languagePreference || 'EN',
        })
        return this.toEntity(model)
    }

    async updateUser(userId: string, updates: UpdateUserRequest): Promise<User> {
        const model = await UserModel.findByPk(userId)
        if (!model) {
            throw new Error(`User with id '${userId}' not found`)
        }
        await model.update(updates)
        return this.toEntity(model)
    }

    async deleteUser(userId: string): Promise<void> {
        const model = await UserModel.findByPk(userId)
        if (model) {
            await model.destroy()
        }
    }

    private toEntity(model: UserModel): User {
        return {
            id: model.id,
            phone: model.phone || undefined,
            email: model.email || undefined,
            password: model.password || undefined,
            fullName: model.fullName,
            role: model.role as UserRole,
            languagePreference: model.languagePreference as 'EN' | 'AR',
            pushNotificationToken: model.pushNotificationToken || undefined,
            isActive: model.isActive,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
        }
    }
}
