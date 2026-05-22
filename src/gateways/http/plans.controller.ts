import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
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
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Plans')
@Controller('api/v1/plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PlansController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'Get all plans' })
  @ApiResponse({ status: 200, description: 'Plans returned' })
  @HandleErrors('get-plans')
  async getPlans(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getPlans({ userId: user.id })
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get active plans with last-used flag and wallet balance',
  })
  @ApiResponse({ status: 200, description: 'Active plans returned' })
  @HandleErrors('get-active-plans')
  async getActivePlans(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getActivePlans({ userId: user.id })
  }
}
