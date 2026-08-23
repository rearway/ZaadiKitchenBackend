import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'

import { UserModel } from './models/UserModel.js'
import { OtpSessionModel } from './models/OtpSessionModel.js'
import { RefreshTokenModel } from './models/RefreshTokenModel.js'
import { DeliveryAreaModel } from './models/DeliveryAreaModel.js'
import { BuildingModel } from './models/BuildingModel.js'
import { OutOfZoneInterestModel } from './models/OutOfZoneInterestModel.js'
import { DeliveryLocationModel } from './models/DeliveryLocationModel.js'
import { PlanModel } from './models/PlanModel.js'
import { CheckoutSessionModel } from './models/CheckoutSessionModel.js'
import { PaymentMethodModel } from './models/PaymentMethodModel.js'
import { OrderModel } from './models/OrderModel.js'
import { SubscriptionModel } from './models/SubscriptionModel.js'
import { DeliveryDayModel } from './models/DeliveryDayModel.js'
import { PublicHolidayModel } from './models/PublicHolidayModel.js'
import { WalletTransactionModel } from './models/WalletTransactionModel.js'
import { PromoCodeModel } from './models/PromoCodeModel.js'
import { UserReferralModel } from './models/UserReferralModel.js'
import { MealModel } from './models/MealModel.js'
import { MenuWeekModel } from './models/MenuWeekModel.js'
import { MenuSlotModel } from './models/MenuSlotModel.js'
import { AuditLogModel } from './models/AuditLogModel.js'
import { DeliveryIssueModel } from './models/DeliveryIssueModel.js'
import { MealRatingModel } from './models/MealRatingModel.js'
import { RiderIssueModel } from './models/RiderIssueModel.js'
import { DailyOpsDayModel } from './models/DailyOpsDayModel.js'
import { UserDeviceModel } from './models/UserDeviceModel.js'
import { PaymentTransactionModel } from './models/PaymentTransactionModel.js'

/**
 * DatabaseModule — owns the full Sequelize connection lifecycle.
 *
 * SSL is enabled for all non-development environments because AWS RDS
 * PostgreSQL 16.x enforces encrypted connections by default.
 * rejectUnauthorized is false because RDS uses an AWS-managed certificate
 * that is not in Node's default trust store (safe within a private VPC).
 */
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const isSslEnabled = configService.get<string>('DB_SSL') === 'true'

        return {
          dialect: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'zaadi'),
          password: configService.get<string>(
            'DB_PASSWORD',
            'zaadi_dev_password'
          ),
          database: configService.get<string>('DB_NAME', 'zaadi_kitchen'),
          models: [
            UserModel,
            OtpSessionModel,
            RefreshTokenModel,
            DeliveryAreaModel,
            BuildingModel,
            OutOfZoneInterestModel,
            DeliveryLocationModel,
            PlanModel,
            CheckoutSessionModel,
            PaymentMethodModel,
            OrderModel,
            SubscriptionModel,
            DeliveryDayModel,
            PublicHolidayModel,
            WalletTransactionModel,
            PromoCodeModel,
            UserReferralModel,
            MealModel,
            MenuWeekModel,
            MenuSlotModel,
            AuditLogModel,
            DeliveryIssueModel,
            MealRatingModel,
            RiderIssueModel,
            DailyOpsDayModel,
            UserDeviceModel,
            PaymentTransactionModel,
          ],
          define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
          },
          autoLoadModels: true,
          synchronize: false, // Use migrations — never auto-sync in production
          logging: isSslEnabled ? false : console.log,
          dialectOptions: isSslEnabled
            ? {
                ssl: {
                  require: true,
                  rejectUnauthorized: false, // AWS-managed RDS cert, safe within VPC
                },
              }
            : {},
        }
      },
      inject: [ConfigService],
    }),
    SequelizeModule.forFeature([
      UserModel,
      OtpSessionModel,
      RefreshTokenModel,
      DeliveryAreaModel,
      BuildingModel,
      OutOfZoneInterestModel,
      DeliveryLocationModel,
      PlanModel,
      CheckoutSessionModel,
      PaymentMethodModel,
      OrderModel,
      SubscriptionModel,
      DeliveryDayModel,
      PublicHolidayModel,
      WalletTransactionModel,
      PromoCodeModel,
      UserReferralModel,
      MealModel,
      MenuWeekModel,
      MenuSlotModel,
      AuditLogModel,
      DeliveryIssueModel,
      MealRatingModel,
      RiderIssueModel,
      DailyOpsDayModel,
      UserDeviceModel,
      PaymentTransactionModel,
    ]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
