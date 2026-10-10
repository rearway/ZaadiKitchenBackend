import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { GetMyDeliveriesQueryDTO, ReportRiderIssueDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

interface AuthenticatedRider {
  id: string
  role: string
}

@ApiTags('Rider App')
@Controller('api/v1/rider')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
@ApiBearerAuth('JWT-auth')
export class RiderController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('deliveries')
  @ApiOperation({ summary: "Get the rider's delivery list for a date (defaults to today)" })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-my-deliveries')
  async getMyDeliveries(
    @CurrentUser() rider: AuthenticatedRider,
    @Query(ValidationPipe) query: GetMyDeliveriesQueryDTO
  ) {
    return this.useCases.queries.getMyDeliveries({
      riderId: rider.id,
      date: query.date,
      areaId: query.area_id,
    })
  }

  @Post('deliveries/:delivery_id/delivered')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a delivery as delivered' })
  @ApiResponse({ status: 200 })
  @HandleErrors('mark-delivery-delivered')
  async markDelivered(@Param('delivery_id') deliveryId: string) {
    return this.useCases.commands.markDeliveryDelivered({ deliveryId })
  }

  @Post('deliveries/:delivery_id/issue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Report a delivery issue' })
  @ApiResponse({ status: 201 })
  @HandleErrors('report-rider-issue')
  async reportIssue(
    @Param('delivery_id') deliveryId: string,
    @CurrentUser() rider: AuthenticatedRider,
    @Body(ValidationPipe) dto: ReportRiderIssueDTO
  ) {
    return this.useCases.commands.reportRiderIssue({
      deliveryId,
      riderId: rider.id,
      issueType: dto.issue_type,
      notes: dto.notes,
    })
  }
}
