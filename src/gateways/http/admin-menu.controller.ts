import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
} from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { GetMenuWeeksQueryDTO, AssignMealToSlotDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Admin Menu Manager')
@Controller('api/v1/admin/menu')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPS)
@ApiBearerAuth('JWT-auth')
export class AdminMenuController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('weeks')
  @ApiOperation({
    summary: 'List week planner weeks (auto-creates current + next)',
  })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-menu-weeks')
  async getWeeks(@Query(ValidationPipe) query: GetMenuWeeksQueryDTO) {
    return this.useCases.queries.getMenuWeeks({
      fromWeek: query.from_week,
      count: query.count,
    })
  }

  @Get('weeks/:week_id')
  @ApiOperation({ summary: 'Get full slot grid for a week' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-menu-week')
  async getWeek(@Param('week_id') weekId: string) {
    return this.useCases.queries.getMenuWeek({ weekId })
  }

  @Post('weeks/:week_id/slots/:slot_id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a meal to a slot' })
  @ApiResponse({ status: 200 })
  @HandleErrors('assign-meal-to-slot')
  async assignMeal(
    @Param('week_id') weekId: string,
    @Param('slot_id') slotId: string,
    @Body(ValidationPipe) dto: AssignMealToSlotDTO
  ) {
    return this.useCases.commands.assignMealToSlot({
      weekId,
      slotId,
      mealId: dto.meal_id,
    })
  }

  @Delete('weeks/:week_id/slots/:slot_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear a meal from a slot' })
  @ApiResponse({ status: 200 })
  @HandleErrors('clear-menu-slot')
  async clearSlot(
    @Param('week_id') weekId: string,
    @Param('slot_id') slotId: string
  ) {
    return this.useCases.commands.clearMenuSlot({ weekId, slotId })
  }

  @Post('weeks/:week_id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a week (requires all 10 slots filled)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('publish-menu-week')
  async publishWeek(
    @Param('week_id') weekId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.publishMenuWeek({
      weekId,
      publishedByUserId: user.id,
    })
  }

  @Post('weeks/:week_id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unpublish a week (move back to draft)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('unpublish-menu-week')
  async unpublishWeek(@Param('week_id') weekId: string) {
    return this.useCases.commands.unpublishMenuWeek({ weekId })
  }
}
