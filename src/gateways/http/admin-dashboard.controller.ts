import { Controller, Get, Inject, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { RolesGuard } from '../../infrastructure/Auth/roles.guard.js'
import { Roles } from '../../infrastructure/Auth/roles.decorator.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin - Dashboard')
@Controller('api/v1/admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDashboardController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Get Dashboard Statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats returned successfully' })
  async getDashboardStats() {
    return this.useCases.queries.getDashboardStats()
  }
}
