import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'
import { JwtModule } from '@nestjs/jwt'

import { CoreAdapterModule } from './coreadapter/coreadapter.module.js'
import { HttpModule } from './gateways/http/http.module.js'
import { JwtStrategy } from './infrastructure/Auth/jwt.strategy.js'
import { DatabaseModule } from './infrastructure/SequelizePersistence/database.module.js'

@Module({
  imports: [
    // Environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database — connection config lives in the infrastructure layer
    DatabaseModule,

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
export class AppModule {}
