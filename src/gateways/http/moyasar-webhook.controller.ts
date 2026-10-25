import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'

@ApiTags('Payments')
@Controller('api/v1/payment/webhooks')
export class MoyasarWebhookController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('moyasar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Moyasar webhook. Verifies secret_token, then settles payment_paid and payment_captured.',
  })
  @ApiResponse({ status: 200, description: 'Event accepted' })
  @ApiResponse({ status: 401, description: 'Invalid webhook secret' })
  @HandleErrors('moyasar-webhook')
  async handle(@Body() payload: unknown) {
    return this.useCases.commands.handleMoyasarWebhook({ payload })
  }
}
