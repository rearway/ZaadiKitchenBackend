import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import {
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
} from '../tokens.js'
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
import { OtpStubService, SnsOtpService } from '../infrastructure/OtpService/index.js'
import { OtpService } from '../core/entitygateway/OtpService.js'
import { MockPaymentGatewayService } from '../infrastructure/MockPayment/mock-payment-gateway.service.js'
import { S3StorageService } from '../infrastructure/S3Storage/index.js'
import { AuditLogPersistenceService } from '../infrastructure/SequelizePersistence/audit-log-persistence.service.js'
import { DeliveryIssuePersistenceService } from '../infrastructure/SequelizePersistence/delivery-issue-persistence.service.js'
import { MealRatingPersistenceService } from '../infrastructure/SequelizePersistence/meal-rating-persistence.service.js'
import { coreAdapterService } from './coreadapter.service.js'

@Module({
  imports: [ConfigModule],
  providers: [
    // Logger
    { provide: LoggerS, useClass: LoggerService },

    // Persistence services
    { provide: UserPersistenceS, useClass: UserPersistenceService },
    { provide: OtpSessionPersistenceS, useClass: OtpSessionPersistenceService },
    {
      provide: RefreshTokenPersistenceS,
      useClass: RefreshTokenPersistenceService,
    },
    { provide: DeliveryPersistenceS, useClass: DeliveryPersistenceService },
    { provide: PlanPersistenceS, useClass: PlanPersistenceService },
    {
      provide: CheckoutSessionPersistenceS,
      useClass: CheckoutSessionPersistenceService,
    },
    {
      provide: PaymentMethodPersistenceS,
      useClass: PaymentMethodPersistenceService,
    },
    { provide: OrderPersistenceS, useClass: OrderPersistenceService },
    {
      provide: SubscriptionPersistenceS,
      useClass: SubscriptionPersistenceService,
    },
    {
      provide: PublicHolidayPersistenceS,
      useClass: PublicHolidayPersistenceService,
    },
    { provide: WalletPersistenceS, useClass: WalletPersistenceService },
    { provide: ReferralPersistenceS, useClass: ReferralPersistenceService },
    { provide: MealPersistenceS, useClass: MealPersistenceService },
    { provide: MenuWeekPersistenceS, useClass: MenuWeekPersistenceService },

    // External services
    {
      provide: OtpServiceS,
      useFactory: (): OtpService => {
        const skipOtp = process.env.SKIP_OTP === 'true'
        return skipOtp ? new OtpStubService() : new SnsOtpService()
      },
    },
    { provide: PaymentGatewayS, useClass: MockPaymentGatewayService },
    { provide: StorageS, useClass: S3StorageService },
    { provide: AuditLogPersistenceS, useClass: AuditLogPersistenceService },
    { provide: DeliveryIssuePersistenceS, useClass: DeliveryIssuePersistenceService },
    { provide: MealRatingPersistenceS, useClass: MealRatingPersistenceService },

    // Core adapter — maps infra → Deps → initUseCases()
    coreAdapterService,
  ],
  exports: [coreAdapterService],
})
export class CoreAdapterModule {}
