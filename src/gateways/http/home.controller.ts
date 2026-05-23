import {
  Controller,
  Get,
  Inject,
  UseGuards,
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
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Home')
@Controller('api/v1/home')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class HomeController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'Home screen composite data (subscription-state aware)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-home')
  async getHome(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getHome({ userId: user.id })
  }

  @Get('this-week')
  @ApiOperation({ summary: 'Home meal strip cards for this week' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-home-this-week')
  async getThisWeek(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getHomeThisWeek({ userId: user.id })
  }
}
