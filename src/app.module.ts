import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'

import { CoreAdapterModule } from './coreadapter/coreadapter.module.js'
import { HttpModule } from './gateways/http/http.module.js'
import { JwtStrategy } from './infrastructure/Auth/jwt.strategy.js'
import { UserModel } from './infrastructure/SequelizePersistence/models/UserModel.js'
import { OtpSessionModel } from './infrastructure/SequelizePersistence/models/OtpSessionModel.js'
import { RefreshTokenModel } from './infrastructure/SequelizePersistence/models/RefreshTokenModel.js'

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME', 'zaadi'),
        password: configService.get<string>('DB_PASSWORD', 'zaadi_dev_password'),
        database: configService.get<string>('DB_NAME', 'zaadi_kitchen'),
        models: [UserModel, OtpSessionModel, RefreshTokenModel],
        autoLoadModels: true,
        synchronize: false, // Use migrations instead
        logging: configService.get<string>('NODE_ENV') === 'development'
          ? console.log
          : false,
      }),
      inject: [ConfigService],
    }),

    // Auth
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),

    // Application modules
    CoreAdapterModule,
    HttpModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule { }
