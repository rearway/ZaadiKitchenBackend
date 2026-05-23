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
import { OtpStubService } from '../infrastructure/OtpService/index.js'
import { MockPaymentGatewayService } from '../infrastructure/MockPayment/mock-payment-gateway.service.js'

export const coreAdapterService: FactoryProvider = {
  provide: CoreS,
  useFactory: (
    logger: LoggerService,
    userPersistence: UserPersistenceService,
    otpSessionPersistence: OtpSessionPersistenceService,
    refreshTokenPersistence: RefreshTokenPersistenceService,
    deliveryPersistence: DeliveryPersistenceService,
    otpService: OtpStubService,
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
    menuWeekPersistence: MenuWeekPersistenceService
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
  ],
}
