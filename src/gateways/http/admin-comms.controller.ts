import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { RolesGuard } from '../../infrastructure/Auth/roles.guard.js'
import { Roles } from '../../infrastructure/Auth/roles.decorator.js'
import { CurrentUser } from '../../infrastructure/Auth/current-user.decorator.js'
import { UserRole } from '../../codecs/enums.js'
import { HandleErrors } from '../../shared/decorators/handle-errors.decorator.js'
import {
  SendCommsBroadcastDTO,
  UpdateCommsAutomationDTO,
} from './dto/admin-comms.dto.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Admin Comms')
@Controller('api/v1/admin/comms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AdminCommsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('automations')
  @ApiOperation({ summary: 'List push notification automations (ADMIN only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 403, description: 'Forbidden — ADMIN role required' })
  @HandleErrors('get-comms-automations')
  async listAutomations() {
    return this.useCases.queries.getCommsAutomations()
  }

  @Patch('automations/:automationId')
  @ApiOperation({ summary: 'Toggle a push automation on/off (ADMIN only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Automation not found' })
  @ApiParam({ name: 'automationId', example: 'delivery_confirmed' })
  @HandleErrors('update-comms-automation')
  async updateAutomation(
    @Param('automationId') automationId: string,
    @Body(ValidationPipe) dto: UpdateCommsAutomationDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.updateCommsAutomation({
      automationId,
      isEnabled: dto.is_enabled,
      adminUserId: user.id,
    })
  }

  @Get('broadcast/segments')
  @ApiOperation({ summary: 'List broadcast segments with live recipient counts' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-broadcast-segments')
  async listBroadcastSegments() {
    return this.useCases.queries.getBroadcastSegments()
  }

  @Get('broadcast/segments/:segmentId/count')
  @ApiOperation({ summary: 'Get live recipient count for one broadcast segment' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Segment not found' })
  @ApiParam({ name: 'segmentId', example: 'delivering_today' })
  @HandleErrors('get-broadcast-segment-count')
  async getBroadcastSegmentCount(@Param('segmentId') segmentId: string) {
    return this.useCases.queries.getBroadcastSegmentCount({ segmentId })
  }

  @Post('broadcast')
  @ApiOperation({ summary: 'Send a push broadcast to a segment (ADMIN only)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Validation error or empty segment' })
  @HandleErrors('send-comms-broadcast')
  async sendBroadcast(
    @Body(ValidationPipe) dto: SendCommsBroadcastDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.sendCommsBroadcast({
      segmentId: dto.segment_id,
      message: dto.message,
      adminUserId: user.id,
    })
  }
}
