export type { UserLoader, UserPersistor, CreateUserRequest, UpdateUserRequest } from './User.js'
export type {
    CreateOtpSessionRequest,
} from './OtpSession.js'
export type {
    CreateRefreshTokenRequest,
} from './RefreshToken.js'
export type { OtpService } from './OtpService.js'
export type { Logger } from './Logger.js'

export * from './User.js'
export * from './OtpSession.js'
export * from './RefreshToken.js'
export * from './OtpService.js'
export * from './Logger.js'
export * from './Delivery.js'

import type { UserLoader, UserPersistor } from './User.js'
import type { OtpSessionLoader, OtpSessionPersistor } from './OtpSession.js'
import type { RefreshTokenLoader, RefreshTokenPersistor } from './RefreshToken.js'
import type { OtpService } from './OtpService.js'
import type { Logger } from './Logger.js'
import type { DeliveryAreaLoader, DeliveryAreaPersistor, BuildingLoader, OutOfZoneInterestPersistor, DeliveryLocationPersistor } from './Delivery.js'

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
    deliveryAreaLoader: DeliveryAreaLoader
    deliveryAreaPersistor: DeliveryAreaPersistor
    buildingLoader: BuildingLoader
    outOfZoneInterestPersistor: OutOfZoneInterestPersistor
    deliveryLocationPersistor: DeliveryLocationPersistor
}
