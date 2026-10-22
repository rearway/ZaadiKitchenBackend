import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Inject,
  UseGuards,
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
} from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { UpdatePlanPricingDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin Plans')
@Controller('api/v1/admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminPlansController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List all plans with price and max price (Admin)' })
  @ApiResponse({ status: 200, description: 'Plans retrieved' })
  @HandleErrors('get-admin-plans')
  async getPlans() {
    return this.useCases.queries.getAdminPlans({})
  }

  @Patch(':plan_id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update plan price and max price (Admin)',
    description:
      'plan_id is the plan slug (try_it, week, month, quarterly) or its UUID. price_per_meal_sar is recalculated from price_sar.',
  })
  @ApiResponse({ status: 200, description: 'Plan pricing updated' })
  @ApiResponse({ status: 400, description: 'max_price_sar lower than price_sar' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  @HandleErrors('update-plan-pricing')
  async updatePlanPricing(
    @Param('plan_id') planId: string,
    @Body(ValidationPipe) dto: UpdatePlanPricingDTO
  ) {
    return this.useCases.commands.updatePlanPricing({
      planId,
      priceSar: dto.price_sar,
      maxPriceSar: dto.max_price_sar,
    })
  }
}
