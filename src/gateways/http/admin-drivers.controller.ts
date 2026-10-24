import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import {
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { UserRole } from '../../codecs/enums.js'
import { CreateDriverDTO } from './dto/CreateDriverDTO.js'
import { UpdateDriverDTO } from './dto/UpdateDriverDTO.js'

@ApiTags('Admin Drivers')
@Controller('api/v1/admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminDriversController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'List drivers and their assigned delivery areas' })
  @ApiResponse({ status: 200, description: 'Drivers retrieved' })
  @HandleErrors('list-admin-drivers')
  async listDrivers() {
    return this.useCases.queries.getAdminDrivers({})
  }

  @Post()
  @ApiOperation({
    summary: 'Create a driver',
    description:
      'Drivers sign in with phone OTP. area_ids assigns one or more delivery areas. A driver with no areas sees an empty rider delivery list.',
  })
  @ApiResponse({ status: 201, description: 'Driver created' })
  @HandleErrors('create-driver')
  async createDriver(@Body(ValidationPipe) dto: CreateDriverDTO) {
    return this.useCases.commands.createDriver({
      fullName: dto.full_name,
      phone: dto.phone,
      areaIds: dto.area_ids,
    })
  }

  @Get(':driver_id')
  @ApiOperation({ summary: 'Get one driver and assigned areas' })
  @ApiResponse({ status: 200, description: 'Driver retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @HandleErrors('get-admin-driver')
  async getDriver(@Param('driver_id') driverId: string) {
    return this.useCases.queries.getAdminDriver({ driverId })
  }

  @Patch(':driver_id')
  @ApiOperation({
    summary: 'Update a driver and/or replace assigned areas',
    description:
      'Send area_ids to replace the full assignment set. Omit area_ids to leave assignments unchanged. Send [] to clear them.',
  })
  @ApiResponse({ status: 200, description: 'Driver updated' })
  @HandleErrors('update-driver')
  async updateDriver(
    @Param('driver_id') driverId: string,
    @Body(ValidationPipe) dto: UpdateDriverDTO
  ) {
    return this.useCases.commands.updateDriver({
      driverId,
      fullName: dto.full_name,
      phone: dto.phone,
      isActive: dto.is_active,
      areaIds: dto.area_ids,
    })
  }

  @Delete(':driver_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Soft-delete a driver',
    description:
      'Sets deleted_at, deactivates the account, releases the phone, clears area assignments, and revokes refresh tokens. The user row is kept so rider issue history remains.',
  })
  @ApiResponse({ status: 200, description: 'Driver deleted' })
  @HandleErrors('delete-driver')
  async deleteDriver(@Param('driver_id') driverId: string) {
    return this.useCases.commands.deleteDriver({ driverId })
  }
}
