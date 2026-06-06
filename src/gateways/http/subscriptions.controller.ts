import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  PauseSubscriptionDTO,
  ResumeSubscriptionDTO,
  SwitchMealTypeDTO,
  ToggleSaladDTO,
} from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Subscriptions')
@Controller('api/v1/subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SubscriptionsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('me')
  @ApiOperation({ summary: 'Get active subscription' })
  @ApiResponse({ status: 200, description: 'Subscription returned' })
  @HandleErrors('get-subscription')
  async getSubscription(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getSubscription({ userId: user.id })
  }

  @Get('me/deliveries')
  @ApiOperation({ summary: 'Get subscription delivery days' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Deliveries returned' })
  @HandleErrors('get-subscription-deliveries')
  async getDeliveries(
    @CurrentUser() user: UserWithoutPassword,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    return this.useCases.queries.getSubscriptionDeliveries({
      userId: user.id,
      from,
      to,
    })
  }

  @Post('me/deliveries/:delivery_date/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip a delivery day' })
  @ApiResponse({ status: 200, description: 'Day skipped' })
  @HandleErrors('skip-delivery')
  async skipDelivery(
    @Param('delivery_date') deliveryDate: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.skipDelivery({
      userId: user.id,
      deliveryDate,
    })
  }

  @Delete('me/deliveries/:delivery_date/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Undo skip for a delivery day' })
  @ApiResponse({ status: 200, description: 'Skip undone' })
  @HandleErrors('undo-skip-delivery')
  async undoSkip(
    @Param('delivery_date') deliveryDate: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.undoSkipDelivery({
      userId: user.id,
      deliveryDate,
    })
  }

  @Patch('me/deliveries/:delivery_date/salad')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle salad add-on for a specific delivery day' })
  @ApiResponse({ status: 200 })
  @HandleErrors('toggle-salad-for-day')
  async toggleSalad(
    @Param('delivery_date') deliveryDate: string,
    @Body() dto: ToggleSaladDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.toggleSaladForDay({
      userId: user.id,
      date: deliveryDate,
      enabled: dto.enabled,
    })
  }

  @Post('me/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause subscription' })
  @ApiResponse({ status: 200, description: 'Paused' })
  @HandleErrors('pause-subscription')
  async pause(
    @Body() dto: PauseSubscriptionDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.pauseSubscription({
      userId: user.id,
      startDate: dto.start_date,
      endDate: dto.end_date,
    })
  }

  @Post('me/resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused subscription' })
  @ApiResponse({ status: 200, description: 'Resumed' })
  @HandleErrors('resume-subscription')
  async resume(
    @Body() dto: ResumeSubscriptionDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.resumeSubscription({
      userId: user.id,
      resumeDate: dto.resume_date,
    })
  }

  @Post('me/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Cancelled' })
  @HandleErrors('cancel-subscription')
  async cancel(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.commands.cancelSubscription({ userId: user.id })
  }

  @Patch('me/meal-type')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch meal type for subscription' })
  @ApiResponse({ status: 200, description: 'Meal type updated' })
  @HandleErrors('switch-meal-type')
  async switchMealType(
    @Body() dto: SwitchMealTypeDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.switchMealType({
      userId: user.id,
      mealType: dto.meal_type,
      applyTo: dto.apply_to,
      specificDays: dto.specific_days,
    })
  }
}
