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
  Query,
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
import { AssignDriverAreaDTO } from './dto/AssignDriverAreaDTO.js'
import { CreateDriverDTO } from './dto/CreateDriverDTO.js'
import { GetDriverDeliveriesQueryDTO } from './dto/GetDriverDeliveriesQueryDTO.js'
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

  @Get('unassigned-areas')
  @ApiOperation({
    summary: 'List delivery areas that have no driver',
    description:
      'Live areas only (deleted areas are omitted), any status. An area already on a driver, including an inactive driver, is excluded. Empty when every area is assigned.',
  })
  @ApiResponse({ status: 200, description: 'Unassigned areas retrieved' })
  @HandleErrors('list-unassigned-areas')
  async listUnassignedAreas() {
    return this.useCases.queries.listUnassignedAreas({})
  }

  @Post()
  @ApiOperation({
    summary: 'Create a driver',
    description:
      'Drivers sign in with phone OTP. area_ids assigns one or more delivery areas. A driver with no areas sees an empty rider delivery list.',
  })
  @ApiResponse({ status: 201, description: 'Driver created' })
  @ApiResponse({
    status: 409,
    description:
      'An area in area_ids is already assigned to another driver (AREA_ALREADY_ASSIGNED).',
  })
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
  @ApiResponse({
    status: 409,
    description:
      'An area in area_ids is already assigned to another driver (AREA_ALREADY_ASSIGNED). Areas this driver already holds are kept.',
  })
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

  @Get(':driver_id/deliveries')
  @ApiOperation({
    summary: "List one driver's meals for an ops day",
    description:
      'Query date is an Asia/Riyadh ops day (YYYY-MM-DD). Omit it for today in Asia/Riyadh. ' +
      "A meal is included when the customer primary location is in one of this driver's areas. " +
      'Empty day, or a driver with no areas, returns deliveries: []. ' +
      'status maps the stored delivery-day status: scheduled and past_cutoff → pending, delivered → delivered, skipped → skipped, paused → paused. ' +
      'There is no out_for_delivery state. domain_status is the stored value. ' +
      'meal_type is executive or salad. ' +
      'review is present only for delivered meals that have a rating: stars plus text (rating tags joined with ", ") and tags. ' +
      'review is null when the meal is not delivered or has no rating. Ratings have no free-text comment column.',
  })
  @ApiResponse({ status: 200, description: 'Driver deliveries retrieved' })
  @ApiResponse({ status: 404, description: 'Driver not found' })
  @HandleErrors('list-driver-deliveries')
  async listDriverDeliveries(
    @Param('driver_id') driverId: string,
    @Query(ValidationPipe) query: GetDriverDeliveriesQueryDTO
  ) {
    return this.useCases.queries.getAdminDriverDeliveries({
      driverId,
      date: query.date,
    })
  }

  @Post(':driver_id/areas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Assign one area to a driver',
    description:
      'Adds the area. Other areas on this driver stay. Assigning an area this driver already has succeeds without a duplicate row. ' +
      'If another driver already has the area, returns 409 AREA_ALREADY_ASSIGNED. The check locks the delivery area row so concurrent assigns cannot both succeed.',
  })
  @ApiResponse({ status: 200, description: 'Area assigned' })
  @ApiResponse({ status: 404, description: 'Driver or area not found' })
  @ApiResponse({
    status: 409,
    description:
      'AREA_ALREADY_ASSIGNED. message: Area "<name>" is already assigned to <driver>. One area = one driver. details: { area_id, area_name, driver_id, driver_name }.',
  })
  @HandleErrors('assign-driver-area')
  async assignArea(
    @Param('driver_id') driverId: string,
    @Body(ValidationPipe) dto: AssignDriverAreaDTO
  ) {
    return this.useCases.commands.assignDriverArea({
      driverId,
      areaId: dto.area_id,
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
