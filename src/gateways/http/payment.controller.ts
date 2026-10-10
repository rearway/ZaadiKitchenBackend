import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Inject,
  UseGuards,
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
import { JwtAuthGuard, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { AddPaymentMethodDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Payment Methods')
@Controller('api/v1/payment/methods')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'Get saved payment methods' })
  @ApiResponse({ status: 200, description: 'Methods returned' })
  @HandleErrors('get-payment-methods')
  async getMethods(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getPaymentMethods({ userId: user.id })
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a payment method' })
  @ApiResponse({ status: 201, description: 'Method added' })
  @HandleErrors('add-payment-method')
  async addMethod(
    @Body() dto: AddPaymentMethodDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.addPaymentMethod({
      userId: user.id,
      type: dto.type,
      token: dto.token,
    })
  }

  @Delete(':method_id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiResponse({ status: 204, description: 'Method removed' })
  @HandleErrors('remove-payment-method')
  async removeMethod(
    @Param('method_id') methodId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    await this.useCases.commands.removePaymentMethod({
      userId: user.id,
      methodId,
    })
  }
}
