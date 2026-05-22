import { Controller, Get, Query, Inject, UseGuards } from '@nestjs/common'
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
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Config')
@Controller('api/v1/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ConfigController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('public-holidays')
  @ApiOperation({ summary: 'Get public holidays by year' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Holidays returned' })
  @HandleErrors('get-public-holidays')
  async getHolidays(
    @Query('year') year: string | undefined,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.queries.getPublicHolidays({
      userId: user.id,
      year: year ? parseInt(year, 10) : undefined,
    })
  }
}
