import {
  Controller,
  Get,
  Post,
  Body,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { ValidateReferralDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Referrals')
@Controller('api/v1/referrals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ReferralsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own referral code and stats' })
  @ApiResponse({ status: 200, description: 'Referral stats returned' })
  @HandleErrors('get-referral')
  async getReferral(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getReferral({ userId: user.id })
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a referral or promo code' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  @HandleErrors('validate-referral')
  async validate(
    @Body() dto: ValidateReferralDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.validateReferral({
      userId: user.id,
      code: dto.code,
      planId: dto.plan_id,
    })
  }
}
