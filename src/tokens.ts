// DI Tokens — Symbol-based dependency injection tokens
// One token per injectable service

// Core
export const CoreS = Symbol('core')

// Logger
export const LoggerS = Symbol('logger')

// Persistence
export const UserPersistenceS = Symbol('user-persistence')
export const OtpSessionPersistenceS = Symbol('otp-session-persistence')
export const RefreshTokenPersistenceS = Symbol('refresh-token-persistence')
export const DeliveryPersistenceS = Symbol('delivery-persistence')

// External Services
export const OtpServiceS = Symbol('otp-service')
