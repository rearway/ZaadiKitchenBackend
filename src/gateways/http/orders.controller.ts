import {
  Controller,
  Get,
  Post,
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
import { CreateOrderDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('Orders')
@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create order (confirm checkout)' })
  @ApiResponse({ status: 201, description: 'Order created' })
  @ApiResponse({ status: 402, description: 'Payment failed' })
  @ApiResponse({ status: 410, description: 'Session expired' })
  @HandleErrors('create-order')
  async createOrder(
    @Body() dto: CreateOrderDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.createOrder({
      userId: user.id,
      sessionId: dto.session_id,
      paymentMethodId: dto.payment_method_id,
      startDate: dto.start_date,
    })
  }

  @Get(':order_id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order returned' })
  @HandleErrors('get-order')
  async getOrder(
    @Param('order_id') orderId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.queries.getOrder({ userId: user.id, orderId })
  }
}
