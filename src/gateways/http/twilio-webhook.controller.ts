import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'

@ApiTags('Authentication')
@Controller('api/v1/auth/webhooks')
export class TwilioWebhookController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('twilio/otp-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Twilio WhatsApp OTP status callback (no JWT). Validates X-Twilio-Signature.',
  })
  @ApiResponse({ status: 200, description: 'Callback accepted' })
  @ApiResponse({ status: 401, description: 'Invalid signature or config' })
  @HandleErrors('twilio-otp-status-webhook')
  async otpStatus(
    @Headers('x-twilio-signature') signature: string | undefined,
    @Body() body: Record<string, string>
  ) {
    return this.useCases.commands.handleTwilioStatusCallback({
      signature,
      body,
    })
  }
}