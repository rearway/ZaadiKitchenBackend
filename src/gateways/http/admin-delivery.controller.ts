import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
  Query,
  Param,
  Get,
  HttpCode,
  HttpStatus,
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
import {
  CreateDeliveryAreaDTO,
  UpdateDeliveryAreaDTO,
  AddBuildingDTO,
  UpdateBuildingDTO,
} from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin Areas & Buildings')
@Controller('api/v1/admin/areas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDeliveryController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  // ── Static routes first to prevent NestJS matching them as :area_id ──

  @Get('out-of-zone-requests')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List out-of-zone interest requests (aggregated)' })
  @ApiResponse({ status: 200, description: 'Out-of-zone requests retrieved' })
  @HandleErrors('get-out-of-zone-requests')
  async getOutOfZoneRequests(
    @Query('page') page?: string,
    @Query('per_page') perPage?: string
  ) {
    return this.useCases.queries.getOutOfZoneRequests({
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 20,
    })
  }

  // ── Collection-level routes ──

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List Areas (Admin)' })
  @ApiResponse({ status: 200, description: 'Areas retrieved' })
  @HandleErrors('list-admin-areas')
  async listAreas(
    @Query('status') status?: 'active' | 'coming_soon' | 'paused'
  ) {
    return this.useCases.queries.getAdminDeliveryAreas({ status })
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Create Delivery Area' })
  @ApiResponse({ status: 201, description: 'Delivery area created' })
  @HandleErrors('create-delivery-area')
  async createDeliveryArea(@Body(ValidationPipe) dto: CreateDeliveryAreaDTO) {
    return this.useCases.commands.createDeliveryArea({
      name: dto.name,
      description: dto.description,
      status: dto.status,
    })
  }

  // ── Area-level routes ──

  @Patch(':area_id')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Update Delivery Area' })
  @ApiResponse({ status: 200, description: 'Delivery area updated' })
  @HandleErrors('update-delivery-area')
  async updateDeliveryArea(
    @Param('area_id') areaId: string,
    @Body(ValidationPipe) dto: UpdateDeliveryAreaDTO
  ) {
    return this.useCases.commands.updateDeliveryArea({
      areaId,
      name: dto.name,
      coverage: dto.coverage,
      status: dto.status,
      confirmActivation: dto.confirm_activation,
    })
  }

  // ── Building collection routes ──

  @Get(':area_id/buildings')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List Buildings for Area (Admin)' })
  @ApiResponse({ status: 200, description: 'Buildings retrieved' })
  @HandleErrors('get-admin-buildings-for-area')
  async getAdminBuildingsForArea(@Param('area_id') areaId: string) {
    return this.useCases.queries.getAdminBuildingsForArea({ areaId })
  }

  @Post(':area_id/buildings')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Add Building to Area' })
  @ApiResponse({ status: 201, description: 'Building added' })
  @HandleErrors('add-building')
  async addBuilding(
    @Param('area_id') areaId: string,
    @Body(ValidationPipe) dto: AddBuildingDTO
  ) {
    return this.useCases.commands.addBuilding({ areaId, name: dto.name })
  }

  // ── Building item routes ──

  @Patch(':area_id/buildings/:building_id')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Rename Building' })
  @ApiResponse({ status: 200, description: 'Building updated' })
  @HandleErrors('update-building')
  async updateBuilding(
    @Param('area_id') areaId: string,
    @Param('building_id') buildingId: string,
    @Body(ValidationPipe) dto: UpdateBuildingDTO
  ) {
    return this.useCases.commands.updateBuilding({
      areaId,
      buildingId,
      name: dto.name,
    })
  }

  @Delete(':area_id/buildings/:building_id')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove Building from Area' })
  @ApiResponse({ status: 200, description: 'Building removed' })
  @HandleErrors('delete-building')
  async deleteBuilding(
    @Param('area_id') areaId: string,
    @Param('building_id') buildingId: string
  ) {
    return this.useCases.commands.deleteBuilding({ areaId, buildingId })
  }
}
