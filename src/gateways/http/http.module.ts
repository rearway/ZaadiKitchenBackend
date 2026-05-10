import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller.js'
import { HealthController } from './health.controller.js'
import { CoreAdapterModule } from '../../coreadapter/coreadapter.module.js'

@Module({
    imports: [CoreAdapterModule],
    controllers: [AuthController, HealthController],
})
export class HttpModule { }
