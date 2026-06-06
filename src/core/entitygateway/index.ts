export type {
  UserLoader,
  UserPersistor,
  CreateUserRequest,
  UpdateUserRequest,
} from './User.js'
export type { CreateOtpSessionRequest } from './OtpSession.js'
export type { CreateRefreshTokenRequest } from './RefreshToken.js'
export type { OtpService } from './OtpService.js'
export type { Logger } from './Logger.js'

export * from './User.js'
export * from './OtpSession.js'
export * from './RefreshToken.js'
export * from './OtpService.js'
export * from './Logger.js'
export * from './Delivery.js'
export * from './Plan.js'
export * from './CheckoutSession.js'
export * from './PromoCode.js'
export * from './PaymentMethod.js'
export * from './Order.js'
export * from './Subscription.js'
export * from './DeliveryDay.js'
export * from './PublicHoliday.js'
export * from './Wallet.js'
export * from './Referral.js'
export * from './PaymentGateway.js'
export * from './Meal.js'
export * from './MenuWeek.js'
export * from './Storage.js'
export * from './AuditLog.js'
export * from './DeliveryIssue.js'
export * from './MealRating.js'

import type { UserLoader, UserPersistor } from './User.js'
import type { OtpSessionLoader, OtpSessionPersistor } from './OtpSession.js'
import type {
  RefreshTokenLoader,
  RefreshTokenPersistor,
} from './RefreshToken.js'
import type { OtpService } from './OtpService.js'
import type { Logger } from './Logger.js'
import type {
  DeliveryAreaLoader,
  DeliveryAreaPersistor,
  BuildingLoader,
  BuildingPersistor,
  OutOfZoneInterestPersistor,
  OutOfZoneInterestLoader,
  DeliveryLocationPersistor,
  DeliveryLocationLoader,
} from './Delivery.js'
import type { PlanLoader, PlanPersistor } from './Plan.js'
import type {
  CheckoutSessionLoader,
  CheckoutSessionPersistor,
} from './CheckoutSession.js'
import type { PromoCodeLoader, PromoCodePersistor } from './PromoCode.js'
import type {
  PaymentMethodLoader,
  PaymentMethodPersistor,
} from './PaymentMethod.js'
import type { OrderLoader, OrderPersistor } from './Order.js'
import type {
  SubscriptionLoader,
  SubscriptionPersistor,
} from './Subscription.js'
import type { DeliveryDayLoader, DeliveryDayPersistor } from './DeliveryDay.js'
import type {
  PublicHolidayLoader,
  PublicHolidayPersistor,
} from './PublicHoliday.js'
import type { WalletLoader, WalletPersistor } from './Wallet.js'
import type { ReferralLoader, ReferralPersistor } from './Referral.js'
import type { PaymentGateway } from './PaymentGateway.js'
import type { MealLoader, MealPersistor } from './Meal.js'
import type { MenuWeekLoader, MenuWeekPersistor } from './MenuWeek.js'
import type { StorageGateway } from './Storage.js'
import type { AuditLogPersistor, AuditLogLoader } from './AuditLog.js'
import type { DeliveryIssuePersistor, DeliveryIssueLoader } from './DeliveryIssue.js'
import type { MealRatingPersistor, MealRatingLoader } from './MealRating.js'

export type Deps = {
  logger: Logger
  userLoader: UserLoader
  userPersistor: UserPersistor
  otpSessionLoader: OtpSessionLoader
  otpSessionPersistor: OtpSessionPersistor
  refreshTokenLoader: RefreshTokenLoader
  refreshTokenPersistor: RefreshTokenPersistor
  otpService: OtpService
  skipOtp: boolean
  jwtSecret: string
  jwtAccessExpiration: string
  jwtRefreshExpirationMobile: string
  jwtRefreshExpirationAdmin: string
  deliveryAreaLoader: DeliveryAreaLoader
  deliveryAreaPersistor: DeliveryAreaPersistor
  buildingLoader: BuildingLoader
  buildingPersistor: BuildingPersistor
  outOfZoneInterestPersistor: OutOfZoneInterestPersistor
  outOfZoneInterestLoader: OutOfZoneInterestLoader
  deliveryLocationPersistor: DeliveryLocationPersistor
  deliveryLocationLoader: DeliveryLocationLoader
  planLoader: PlanLoader
  planPersistor: PlanPersistor
  checkoutSessionLoader: CheckoutSessionLoader
  checkoutSessionPersistor: CheckoutSessionPersistor
  promoCodeLoader: PromoCodeLoader
  promoCodePersistor: PromoCodePersistor
  paymentMethodLoader: PaymentMethodLoader
  paymentMethodPersistor: PaymentMethodPersistor
  orderLoader: OrderLoader
  orderPersistor: OrderPersistor
  subscriptionLoader: SubscriptionLoader
  subscriptionPersistor: SubscriptionPersistor
  deliveryDayLoader: DeliveryDayLoader
  deliveryDayPersistor: DeliveryDayPersistor
  publicHolidayLoader: PublicHolidayLoader
  publicHolidayPersistor: PublicHolidayPersistor
  walletLoader: WalletLoader
  walletPersistor: WalletPersistor
  referralLoader: ReferralLoader
  referralPersistor: ReferralPersistor
  paymentGateway: PaymentGateway
  mealLoader: MealLoader
  mealPersistor: MealPersistor
  menuWeekLoader: MenuWeekLoader
  menuWeekPersistor: MenuWeekPersistor
  storageGateway: StorageGateway
  auditLogPersistor: AuditLogPersistor
  auditLogLoader: AuditLogLoader
  deliveryIssuePersistor: DeliveryIssuePersistor
  deliveryIssueLoader: DeliveryIssueLoader
  mealRatingPersistor: MealRatingPersistor
  mealRatingLoader: MealRatingLoader
}
