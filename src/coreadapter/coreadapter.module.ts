import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import {
    LoggerS,
    UserPersistenceS,
    OtpSessionPersistenceS,
    RefreshTokenPersistenceS,
    OtpServiceS,
} from '../tokens.js'
import { LoggerService } from '../infrastructure/Logger/index.js'
import { UserPersistenceService } from '../infrastructure/SequelizePersistence/user-persistence.service.js'
import { OtpSessionPersistenceService } from '../infrastructure/SequelizePersistence/otp-session-persistence.service.js'
import { RefreshTokenPersistenceService } from '../infrastructure/SequelizePersistence/refresh-token-persistence.service.js'
import { OtpStubService } from '../infrastructure/OtpService/index.js'
import { coreAdapterService } from './coreadapter.service.js'

@Module({
    imports: [ConfigModule],
    providers: [
        // Logger
        { provide: LoggerS, useClass: LoggerService },

        // Persistence services
        { provide: UserPersistenceS, useClass: UserPersistenceService },
        { provide: OtpSessionPersistenceS, useClass: OtpSessionPersistenceService },
        { provide: RefreshTokenPersistenceS, useClass: RefreshTokenPersistenceService },

        // External services
        { provide: OtpServiceS, useClass: OtpStubService },

        // Core adapter — maps infra → Deps → initUseCases()
        coreAdapterService,
    ],
    exports: [coreAdapterService],
})
export class CoreAdapterModule { }
