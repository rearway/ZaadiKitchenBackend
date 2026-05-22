import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
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
import { CreateCheckoutSessionDTO, ApplyPromoCodeDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Checkout')
@Controller('api/v1/checkout')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class CheckoutController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create checkout session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  @HandleErrors('create-checkout-session')
  async createSession(
    @Body() dto: CreateCheckoutSessionDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.createCheckoutSession({
      userId: user.id,
      planId: dto.plan_id,
      mealType: dto.meal_type,
    })
  }

  @Get('session/:session_id')
  @ApiOperation({ summary: 'Get checkout session by ID' })
  @ApiResponse({ status: 200, description: 'Session returned' })
  @ApiResponse({ status: 410, description: 'Session expired' })
  @HandleErrors('get-checkout-session')
  async getSession(
    @Param('session_id') sessionId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.queries.getCheckoutSession({
      userId: user.id,
      sessionId,
    })
  }

  @Post('session/:session_id/promo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply promo code to session' })
  @ApiResponse({ status: 200, description: 'Code applied' })
  @HandleErrors('apply-promo-code')
  async applyPromo(
    @Param('session_id') sessionId: string,
    @Body() dto: ApplyPromoCodeDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.applyPromoCode({
      userId: user.id,
      sessionId,
      code: dto.code,
    })
  }

  @Delete('session/:session_id/promo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove promo code from session' })
  @ApiResponse({ status: 200, description: 'Code removed' })
  @HandleErrors('remove-promo-code')
  async removePromo(
    @Param('session_id') sessionId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.removePromoCode({
      userId: user.id,
      sessionId,
    })
  }
}
