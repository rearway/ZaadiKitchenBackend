export type { UserLoader, UserPersistor, CreateUserRequest, UpdateUserRequest } from './User.js'
export type {
    CreateOtpSessionRequest,
} from './OtpSession.js'
export type {
    CreateRefreshTokenRequest,
} from './RefreshToken.js'
export type { OtpService } from './OtpService.js'
export type { Logger } from './Logger.js'

import type { UserLoader, UserPersistor } from './User.js'
import type { OtpSessionLoader, OtpSessionPersistor } from './OtpSession.js'
import type { RefreshTokenLoader, RefreshTokenPersistor } from './RefreshToken.js'
import type { OtpService } from './OtpService.js'
import type { Logger } from './Logger.js'

export type Deps = {
    logger: Logger
    userLoader: UserLoader
    userPersistor: UserPersistor
    otpSessionLoader: OtpSessionLoader
    otpSessionPersistor: OtpSessionPersistor
    refreshTokenLoader: RefreshTokenLoader
    refreshTokenPersistor: RefreshTokenPersistor
    otpService: OtpService
    jwtSecret: string
    jwtAccessExpiration: string
    jwtRefreshExpirationMobile: string
    jwtRefreshExpirationAdmin: string
}
