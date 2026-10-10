import { Controller, Get, Inject, Query, UseGuards, ValidationPipe } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { RolesGuard } from '../../infrastructure/Auth/roles.guard.js'
import { Roles } from '../../infrastructure/Auth/roles.decorator.js'
import { UserRole } from '../../codecs/enums.js'
import { HandleErrors } from '../../shared/decorators/handle-errors.decorator.js'
import { GetRevenueDailyQueryDTO } from './dto/GetRevenueDailyQueryDTO.js'

@ApiTags('Admin Revenue')
@Controller('api/v1/admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminRevenueController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('summary')
  @ApiOperation({ summary: 'Revenue dashboard summary (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Revenue summary retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @HandleErrors('get-revenue-summary')
  async getSummary() {
    return this.useCases.queries.getRevenueSummary()
  }

  @Get('daily')
  @ApiOperation({ summary: 'Daily revenue chart data (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Daily revenue retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @HandleErrors('get-revenue-daily')
  async getDaily(@Query(ValidationPipe) query: GetRevenueDailyQueryDTO) {
    return this.useCases.queries.getRevenueDaily({ month: query.month })
  }
}
