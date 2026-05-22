import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller.js'
import { HealthController } from './health.controller.js'
import { UserController } from './user.controller.js'
import { DeliveryController } from './delivery.controller.js'
import { AdminDeliveryController } from './admin-delivery.controller.js'
import { PlansController } from './plans.controller.js'
import { CheckoutController } from './checkout.controller.js'
import { PaymentController } from './payment.controller.js'
import { OrdersController } from './orders.controller.js'
import { SubscriptionsController } from './subscriptions.controller.js'
import { ReferralsController } from './referrals.controller.js'
import { ConfigController } from './config.controller.js'
import { CoreAdapterModule } from '../../coreadapter/coreadapter.module.js'

@Module({
  imports: [CoreAdapterModule],
  controllers: [
    AuthController,
    UserController,
    DeliveryController,
    AdminDeliveryController,
    PlansController,
    CheckoutController,
    PaymentController,
    OrdersController,
    SubscriptionsController,
    ReferralsController,
    ConfigController,
    HealthController,
  ],
})
export class HttpModule {}
