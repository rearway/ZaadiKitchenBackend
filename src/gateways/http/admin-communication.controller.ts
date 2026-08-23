import {
  Controller,
  Post,
  Body,
  Inject,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { RolesGuard } from '../../infrastructure/Auth/roles.guard.js'
import { Roles } from '../../infrastructure/Auth/roles.decorator.js'
import { UserRole } from '../../codecs/enums.js'
import { SendBulkBroadcastDTO } from './dto/admin-communication.dto.js'

@ApiTags('Admin Communications')
@Controller('api/v1/admin/communications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminCommunicationController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('broadcast')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Send a bulk broadcast push notification to all users' })
  @ApiResponse({ status: 200, description: 'Broadcast sent successfully' })
  async sendBroadcast(@Body(ValidationPipe) dto: SendBulkBroadcastDTO) {
    return this.useCases.commands.sendBulkBroadcast({
      title: dto.title,
      body: dto.body,
    })
  }
}
