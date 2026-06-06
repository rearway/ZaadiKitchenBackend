import {
  Controller,
  Post,
  Body,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { InternalSecretGuard } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'

@ApiTags('Internal Jobs')
@Controller('internal/jobs')
@UseGuards(InternalSecretGuard)
export class InternalJobsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('expire-subscriptions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Expire active subscriptions past their end date (EventBridge trigger)',
  })
  @ApiResponse({ status: 200 })
  @HandleErrors('expire-subscriptions')
  async expireSubscriptions(@Body() body: { as_of_date?: string }) {
    return this.useCases.commands.expireSubscriptions({
      asOfDate: body?.as_of_date,
    })
  }
}
