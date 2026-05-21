import {
  Controller,
  Post,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
  Query,
  Param,
  Get,
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
import { CreateDeliveryAreaDTO, AddBuildingDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin Areas & Buildings')
@Controller('api/v1/admin/areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDeliveryController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List Areas (Admin)' })
  @ApiResponse({ status: 200, description: 'Areas retrieved' })
  @HandleErrors('list-admin-areas')
  async listAreas(
    @Query('status') status?: 'active' | 'coming_soon' | 'paused'
  ) {
    const result = await this.useCases.queries.getAdminDeliveryAreas({ status })
    return result
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Create Delivery Area' })
  @ApiResponse({ status: 201, description: 'Delivery area created' })
  @HandleErrors('create-delivery-area')
  async createDeliveryArea(@Body(ValidationPipe) dto: CreateDeliveryAreaDTO) {
    const result = await this.useCases.commands.createDeliveryArea({
      name: dto.name,
      description: dto.description,
      status: dto.status,
    })
    return result
  }

  @Post(':area_id/buildings')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Add Building' })
  @ApiResponse({ status: 201, description: 'Building added' })
  @HandleErrors('add-building')
  async addBuilding(
    @Param('area_id') areaId: string,
    @Body(ValidationPipe) dto: AddBuildingDTO
  ) {
    const result = await this.useCases.commands.addBuilding({
      areaId,
      name: dto.name,
    })
    return result
  }
}
