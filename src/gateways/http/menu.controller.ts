import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
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
import { GetCustomerMenuWeekQueryDTO, SubmitMealRatingDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Menu')
@Controller('api/v1')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MenuController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('menu')
  @ApiOperation({ summary: 'Menu tab header metadata (week labels, filter chips)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-menu-meta')
  async getMenuMeta(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getMenuMeta({ userId: user.id })
  }

  @Get('menu/week')
  @ApiOperation({ summary: 'Full 10-day meal schedule (this week + next week)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-customer-menu-week')
  async getMenuWeek(
    @CurrentUser() user: UserWithoutPassword,
    @Query(ValidationPipe) query: GetCustomerMenuWeekQueryDTO
  ) {
    return this.useCases.queries.getCustomerMenuWeek({
      userId: user.id,
      mealType: query.meal_type,
    })
  }

  @Get('meals/:meal_id')
  @ApiOperation({ summary: 'Meal detail (bottom sheet + full screen)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-meal-detail')
  async getMealDetail(@Param('meal_id') mealId: string) {
    return this.useCases.queries.getMealDetail({ mealId })
  }

  @Post('meals/:meal_id/rating')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a star rating for a delivered meal' })
  @ApiResponse({ status: 201, description: 'Rating submitted' })
  @HandleErrors('submit-meal-rating')
  async submitRating(
    @Param('meal_id') mealId: string,
    @Body(ValidationPipe) dto: SubmitMealRatingDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.submitMealRating({
      userId: user.id,
      mealId,
      deliveryDayId: dto.deliveryDayId,
      stars: dto.stars,
      tags: dto.tags,
    })
  }
}
