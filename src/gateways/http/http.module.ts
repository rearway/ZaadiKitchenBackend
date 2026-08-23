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
import { AdminMealsController } from './admin-meals.controller.js'
import { AdminMenuController } from './admin-menu.controller.js'
import { HomeController } from './home.controller.js'
import { MenuController } from './menu.controller.js'
import { InternalJobsController } from './internal-jobs.controller.js'
import { AdminCustomersController } from './admin-customers.controller.js'
import { RiderController } from './rider.controller.js'
import { AdminDailyOpsController } from './admin-daily-ops.controller.js'
import { OpsDailyOpsController } from './ops-daily-ops.controller.js'
import { DeviceController } from './device.controller.js'
import { AdminCommunicationController } from './admin-communication.controller.js'
import { AdminDashboardController } from './admin-dashboard.controller.js'
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
    AdminMealsController,
    AdminMenuController,
    HomeController,
    MenuController,
    InternalJobsController,
    AdminCustomersController,
    RiderController,
    AdminDailyOpsController,
    OpsDailyOpsController,
    DeviceController,
    AdminCommunicationController,
    AdminDashboardController,
  ],
})
export class HttpModule {}
