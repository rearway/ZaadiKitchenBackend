import {
  Controller,
  Get,
  Post,
  Patch,
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
import {
  GetMenuWeeksQueryDTO,
  AssignMealToSlotDTO,
  AddMenuDaySlotDTO,
  SetMenuDayDefaultDTO,
} from './dto/index.js'
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

  @Post('weeks/:week_id/days/:date/slots')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add an Executive or Salad slot for a day (max 3 per stream)',
  })
  @ApiResponse({ status: 200 })
  @HandleErrors('add-menu-slot')
  async addSlot(
    @Param('week_id') weekId: string,
    @Param('date') date: string,
    @Body(ValidationPipe) dto: AddMenuDaySlotDTO
  ) {
    return this.useCases.commands.addMenuSlot({
      weekId,
      date,
      mealType: dto.meal_type,
      mealId: dto.meal_id,
    })
  }

  @Patch('weeks/:week_id/days/:date/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set the default dish for a stream on a day' })
  @ApiResponse({ status: 200 })
  @HandleErrors('set-menu-day-default')
  async setDefault(
    @Param('week_id') weekId: string,
    @Param('date') date: string,
    @Body(ValidationPipe) dto: SetMenuDayDefaultDTO
  ) {
    return this.useCases.commands.setMenuDayDefault({
      weekId,
      date,
      mealType: dto.meal_type,
      mealId: dto.meal_id,
    })
  }

  @Post('weeks/:week_id/slots/:slot_id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign a meal to a slot',
    description:
      'Active or updated meals can be assigned. Up to 3 Executive and 3 Salad slots per day. Draft meals are rejected (422 MEAL_IS_DRAFT).',
  })
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
  @ApiOperation({
    summary: 'Publish a week',
    description:
      'Requires min 1 Executive and 1 Salad per day, max 3 of each, and a default for each stream.',
  })
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
