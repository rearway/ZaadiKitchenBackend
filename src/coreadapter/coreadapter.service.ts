import { FactoryProvider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import {
  CoreS,
  LoggerS,
  UserPersistenceS,
  OtpSessionPersistenceS,
  RefreshTokenPersistenceS,
  DeliveryPersistenceS,
  OtpServiceS,
  PlanPersistenceS,
  CheckoutSessionPersistenceS,
  PaymentMethodPersistenceS,
  OrderPersistenceS,
  SubscriptionPersistenceS,
  PublicHolidayPersistenceS,
  WalletPersistenceS,
  ReferralPersistenceS,
  PaymentGatewayS,
  MealPersistenceS,
  MenuWeekPersistenceS,
  StorageS,
  AuditLogPersistenceS,
  DeliveryIssuePersistenceS,
  MealRatingPersistenceS,
  AdminCustomerPersistenceS,
} from '../tokens.js'
import { initUseCases, UseCases } from '../core/usecases/index.js'
import { LoggerService } from '../infrastructure/Logger/index.js'
import { UserPersistenceService } from '../infrastructure/SequelizePersistence/user-persistence.service.js'
import { OtpSessionPersistenceService } from '../infrastructure/SequelizePersistence/otp-session-persistence.service.js'
import { RefreshTokenPersistenceService } from '../infrastructure/SequelizePersistence/refresh-token-persistence.service.js'
import { DeliveryPersistenceService } from '../infrastructure/SequelizePersistence/delivery-persistence.service.js'
import { PlanPersistenceService } from '../infrastructure/SequelizePersistence/plan-persistence.service.js'
import { CheckoutSessionPersistenceService } from '../infrastructure/SequelizePersistence/checkout-session-persistence.service.js'
import { PaymentMethodPersistenceService } from '../infrastructure/SequelizePersistence/payment-method-persistence.service.js'
import { OrderPersistenceService } from '../infrastructure/SequelizePersistence/order-persistence.service.js'
import { SubscriptionPersistenceService } from '../infrastructure/SequelizePersistence/subscription-persistence.service.js'
import { PublicHolidayPersistenceService } from '../infrastructure/SequelizePersistence/public-holiday-persistence.service.js'
import { WalletPersistenceService } from '../infrastructure/SequelizePersistence/wallet-persistence.service.js'
import { ReferralPersistenceService } from '../infrastructure/SequelizePersistence/referral-persistence.service.js'
import { MealPersistenceService } from '../infrastructure/SequelizePersistence/meal-persistence.service.js'
import { MenuWeekPersistenceService } from '../infrastructure/SequelizePersistence/menu-week-persistence.service.js'
import { OtpService } from '../core/entitygateway/OtpService.js'
import { MockPaymentGatewayService } from '../infrastructure/MockPayment/mock-payment-gateway.service.js'
import { S3StorageService } from '../infrastructure/S3Storage/index.js'
import { AuditLogPersistenceService } from '../infrastructure/SequelizePersistence/audit-log-persistence.service.js'
import { DeliveryIssuePersistenceService } from '../infrastructure/SequelizePersistence/delivery-issue-persistence.service.js'
import { MealRatingPersistenceService } from '../infrastructure/SequelizePersistence/meal-rating-persistence.service.js'
import { AdminCustomerPersistenceService } from '../infrastructure/SequelizePersistence/admin-customer-persistence.service.js'

export const coreAdapterService: FactoryProvider = {
  provide: CoreS,
  useFactory: (
    logger: LoggerService,
    userPersistence: UserPersistenceService,
    otpSessionPersistence: OtpSessionPersistenceService,
    refreshTokenPersistence: RefreshTokenPersistenceService,
    deliveryPersistence: DeliveryPersistenceService,
    otpService: OtpService,
    configService: ConfigService,
    planPersistence: PlanPersistenceService,
    checkoutSessionPersistence: CheckoutSessionPersistenceService,
    paymentMethodPersistence: PaymentMethodPersistenceService,
    orderPersistence: OrderPersistenceService,
    subscriptionPersistence: SubscriptionPersistenceService,
    publicHolidayPersistence: PublicHolidayPersistenceService,
    walletPersistence: WalletPersistenceService,
    referralPersistence: ReferralPersistenceService,
    paymentGateway: MockPaymentGatewayService,
    mealPersistence: MealPersistenceService,
    menuWeekPersistence: MenuWeekPersistenceService,
    storageGateway: S3StorageService,
    auditLogPersistence: AuditLogPersistenceService,
    deliveryIssuePersistence: DeliveryIssuePersistenceService,
    mealRatingPersistence: MealRatingPersistenceService,
    adminCustomerPersistence: AdminCustomerPersistenceService
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
      skipOtp: configService.get<string>('SKIP_OTP', 'true') === 'true',
      jwtSecret: configService.get<string>('JWT_SECRET', 'default-secret'),
      jwtAccessExpiration: configService.get<string>(
        'JWT_ACCESS_EXPIRATION',
        '15m'
      ),
      jwtRefreshExpirationMobile: configService.get<string>(
        'JWT_REFRESH_EXPIRATION_MOBILE',
        '30d'
      ),
      jwtRefreshExpirationAdmin: configService.get<string>(
        'JWT_REFRESH_EXPIRATION_ADMIN',
        '8h'
      ),
      deliveryAreaLoader: deliveryPersistence,
      deliveryAreaPersistor: deliveryPersistence,
      buildingLoader: deliveryPersistence,
      buildingPersistor: deliveryPersistence,
      outOfZoneInterestPersistor: deliveryPersistence,
      outOfZoneInterestLoader: deliveryPersistence,
      deliveryLocationPersistor: deliveryPersistence,
      deliveryLocationLoader: deliveryPersistence,
      planLoader: planPersistence,
      planPersistor: planPersistence,
      checkoutSessionLoader: checkoutSessionPersistence,
      checkoutSessionPersistor: checkoutSessionPersistence,
      promoCodeLoader: checkoutSessionPersistence,
      promoCodePersistor: checkoutSessionPersistence,
      paymentMethodLoader: paymentMethodPersistence,
      paymentMethodPersistor: paymentMethodPersistence,
      orderLoader: orderPersistence,
      orderPersistor: orderPersistence,
      subscriptionLoader: subscriptionPersistence,
      subscriptionPersistor: subscriptionPersistence,
      deliveryDayLoader: subscriptionPersistence,
      deliveryDayPersistor: subscriptionPersistence,
      publicHolidayLoader: publicHolidayPersistence,
      publicHolidayPersistor: publicHolidayPersistence,
      walletLoader: walletPersistence,
      walletPersistor: walletPersistence,
      referralLoader: referralPersistence,
      referralPersistor: referralPersistence,
      paymentGateway,
      mealLoader: mealPersistence,
      mealPersistor: mealPersistence,
      menuWeekLoader: menuWeekPersistence,
      menuWeekPersistor: menuWeekPersistence,
      storageGateway,
      auditLogPersistor: auditLogPersistence,
      auditLogLoader: auditLogPersistence,
      deliveryIssuePersistor: deliveryIssuePersistence,
      deliveryIssueLoader: deliveryIssuePersistence,
      mealRatingPersistor: mealRatingPersistence,
      mealRatingLoader: mealRatingPersistence,
      adminCustomerLoader: adminCustomerPersistence,
      adminCustomerPersistor: adminCustomerPersistence,
    }),
  inject: [
    LoggerS,
    UserPersistenceS,
    OtpSessionPersistenceS,
    RefreshTokenPersistenceS,
    DeliveryPersistenceS,
    OtpServiceS,
    ConfigService,
    PlanPersistenceS,
    CheckoutSessionPersistenceS,
    PaymentMethodPersistenceS,
    OrderPersistenceS,
    SubscriptionPersistenceS,
    PublicHolidayPersistenceS,
    WalletPersistenceS,
    ReferralPersistenceS,
    PaymentGatewayS,
    MealPersistenceS,
    MenuWeekPersistenceS,
    StorageS,
    AuditLogPersistenceS,
    DeliveryIssuePersistenceS,
    MealRatingPersistenceS,
    AdminCustomerPersistenceS,
  ],
}
