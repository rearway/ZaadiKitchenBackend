import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'

import { UserModel } from './models/UserModel.js'
import { OtpSessionModel } from './models/OtpSessionModel.js'
import { RefreshTokenModel } from './models/RefreshTokenModel.js'

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
        const isProduction = configService.get<string>('NODE_ENV') !== 'development'

        return {
          dialect: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'zaadi'),
          password: configService.get<string>('DB_PASSWORD', 'zaadi_dev_password'),
          database: configService.get<string>('DB_NAME', 'zaadi_kitchen'),
          models: [UserModel, OtpSessionModel, RefreshTokenModel],
          autoLoadModels: true,
          synchronize: false, // Use migrations — never auto-sync in production
          logging: isProduction ? false : console.log,
          dialectOptions: isProduction
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
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
