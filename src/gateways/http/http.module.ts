import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller.js'
import { HealthController } from './health.controller.js'
import { UserController } from './user.controller.js'
import { DeliveryController } from './delivery.controller.js'
import { AdminDeliveryController } from './admin-delivery.controller.js'
import { CoreAdapterModule } from '../../coreadapter/coreadapter.module.js'

@Module({
  imports: [CoreAdapterModule],
  controllers: [
    AuthController,
    UserController,
    DeliveryController,
    AdminDeliveryController,
    HealthController,
  ],
})
export class HttpModule {}
