import { FactoryProvider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { CoreS, LoggerS, UserPersistenceS, OtpSessionPersistenceS, RefreshTokenPersistenceS, OtpServiceS } from '../tokens.js'
import { initUseCases, UseCases } from '../core/usecases/index.js'
import { LoggerService } from '../infrastructure/Logger/index.js'
import { UserPersistenceService } from '../infrastructure/SequelizePersistence/user-persistence.service.js'
import { OtpSessionPersistenceService } from '../infrastructure/SequelizePersistence/otp-session-persistence.service.js'
import { RefreshTokenPersistenceService } from '../infrastructure/SequelizePersistence/refresh-token-persistence.service.js'
import { OtpStubService } from '../infrastructure/OtpService/index.js'

export const coreAdapterService: FactoryProvider = {
    provide: CoreS,
    useFactory: (
        logger: LoggerService,
        userPersistence: UserPersistenceService,
        otpSessionPersistence: OtpSessionPersistenceService,
        refreshTokenPersistence: RefreshTokenPersistenceService,
        otpService: OtpStubService,
        configService: ConfigService
    ): UseCases =>
        initUseCases({
            logger,
            userLoader: userPersistence,
            userPersistor: userPersistence,
            otpSessionLoader: otpSessionPersistence,
            otpSessionPersistor: otpSessionPersistence,
            refreshTokenLoader: refreshTokenPersistence,
            refreshTokenPersistor: refreshTokenPersistence,
            otpService: otpService,
            jwtSecret: configService.get<string>('JWT_SECRET', 'default-secret'),
            jwtAccessExpiration: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
            jwtRefreshExpirationMobile: configService.get<string>('JWT_REFRESH_EXPIRATION_MOBILE', '30d'),
            jwtRefreshExpirationAdmin: configService.get<string>('JWT_REFRESH_EXPIRATION_ADMIN', '8h'),
        }),
    inject: [
        LoggerS,
        UserPersistenceS,
        OtpSessionPersistenceS,
        RefreshTokenPersistenceS,
        OtpServiceS,
        ConfigService,
    ],
}
