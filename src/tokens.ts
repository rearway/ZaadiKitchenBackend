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
export const PlanPersistenceS = Symbol('plan-persistence')
export const CheckoutSessionPersistenceS = Symbol(
  'checkout-session-persistence'
)
export const PaymentMethodPersistenceS = Symbol('payment-method-persistence')
export const OrderPersistenceS = Symbol('order-persistence')
export const SubscriptionPersistenceS = Symbol('subscription-persistence')
export const PublicHolidayPersistenceS = Symbol('public-holiday-persistence')
export const WalletPersistenceS = Symbol('wallet-persistence')
export const ReferralPersistenceS = Symbol('referral-persistence')

export const MealPersistenceS = Symbol('meal-persistence')
export const MenuWeekPersistenceS = Symbol('menu-week-persistence')

// External Services
export const OtpServiceS = Symbol('otp-service')
export const PaymentGatewayS = Symbol('payment-gateway')
export const StorageS = Symbol('storage')
export const AuditLogPersistenceS = Symbol('audit-log-persistence')
export const DeliveryIssuePersistenceS = Symbol('delivery-issue-persistence')
export const MealRatingPersistenceS = Symbol('meal-rating-persistence')
export const AdminCustomerPersistenceS = Symbol('admin-customer-persistence')
export const RiderPersistenceS = Symbol('rider-persistence')
export const DailyOpsPersistenceS = Symbol('daily-ops-persistence')
export const NotificationS = Symbol('notification')
export const UserDevicePersistenceS = Symbol('user-device-persistence')
