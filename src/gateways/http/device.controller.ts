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
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { CurrentUser } from '../../infrastructure/Auth/current-user.decorator.js'
import type { UserWithoutPassword } from '../../core/entities/User.js'
import { RegisterDeviceDTO } from './dto/device.dto.js'

@ApiTags('Devices')
@Controller('api/v1/devices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class DeviceController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a device for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  async registerDevice(
    @Body(ValidationPipe) dto: RegisterDeviceDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.registerDevice({
      userId: user.id,
      platform: dto.platform,
      deviceToken: dto.deviceToken,
    })
  }
}
