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
          ],
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
    ]),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
