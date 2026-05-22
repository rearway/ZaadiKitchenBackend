import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
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
  SearchDeliveryAreasDTO,
  GetBuildingsForAreaDTO,
  SubmitOutOfZoneInterestDTO,
} from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Delivery Areas')
@Controller('api/v1/delivery')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DeliveryController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('areas')
  @ApiOperation({ summary: 'List Active Delivery Areas' })
  @ApiResponse({ status: 200, description: 'Active delivery areas' })
  @HandleErrors('get-delivery-areas')
  async getActiveAreas() {
    const result = await this.useCases.queries.getActiveDeliveryAreas()
    return result
  }

  @Get('areas/search')
  @ApiOperation({ summary: 'Search Delivery Areas' })
  @ApiResponse({ status: 200, description: 'Search results' })
  @HandleErrors('search-delivery-areas')
  async searchAreas(@Query(ValidationPipe) dto: SearchDeliveryAreasDTO) {
    const result = await this.useCases.queries.searchDeliveryAreas({
      query: dto.q,
    })
    return result
  }

  @Post('areas/out-of-zone')
  @ApiOperation({ summary: 'Submit Out-of-Zone Interest' })
  @ApiResponse({ status: 201, description: 'Interest submitted' })
  @HandleErrors('submit-out-of-zone')
  async submitOutOfZoneInterest(
    @Body(ValidationPipe) dto: SubmitOutOfZoneInterestDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    const result = await this.useCases.commands.submitOutOfZoneInterest({
      userId: user.id,
      areaName: dto.areaName,
    })
    return result
  }

  @Get('areas/:area_id/buildings')
  @ApiOperation({ summary: 'List Buildings for Area' })
  @ApiResponse({ status: 200, description: 'Buildings in area' })
  @HandleErrors('get-buildings-for-area')
  async getBuildingsForArea(
    @Param('area_id') areaId: string,
    @Query(ValidationPipe) dto: GetBuildingsForAreaDTO
  ) {
    const result = await this.useCases.queries.getBuildingsForArea({
      areaId,
      query: dto.q,
    })
    return result
  }

  @Get('start-dates')
  @ApiOperation({ summary: 'Get valid delivery start dates' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Start dates returned' })
  @HandleErrors('get-delivery-start-dates')
  async getDeliveryStartDates(
    @CurrentUser() user: UserWithoutPassword,
    @Query('from') from?: string,
    @Query('limit') limit?: string
  ) {
    return this.useCases.queries.getDeliveryStartDates({
      userId: user.id,
      from,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
  }
}
