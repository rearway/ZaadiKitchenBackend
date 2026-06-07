import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger'
import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard } from '../../infrastructure/Auth/jwt-auth.guard.js'
import { RolesGuard } from '../../infrastructure/Auth/roles.guard.js'
import { Roles } from '../../infrastructure/Auth/roles.decorator.js'
import { UserRole } from '../../codecs/enums.js'
import { HandleErrors } from '../../shared/decorators/handle-errors.decorator.js'
import { GetAdminCustomersQueryDTO } from './dto/GetAdminCustomersQueryDTO.js'
import { AdminCreditWalletDTO } from './dto/AdminCreditWalletDTO.js'

@ApiTags('Admin Customers')
@Controller('api/v1/admin/customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminCustomersController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({
    summary:
      'List customers — search by name/phone/email, filter by subscription status',
  })
  @ApiResponse({ status: 200, description: 'Customer list retrieved' })
  @HandleErrors('list-admin-customers')
  async listCustomers(@Query(ValidationPipe) query: GetAdminCustomersQueryDTO) {
    return this.useCases.queries.getAdminCustomers({
      q: query.q,
      status: query.status,
      page: query.page,
      perPage: query.per_page,
    })
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({
    summary:
      'Get customer inline detail — current plan, wallet, address, issue count',
  })
  @ApiResponse({ status: 200, description: 'Customer detail retrieved' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiParam({ name: 'id', description: 'Customer user ID' })
  @HandleErrors('get-admin-customer')
  async getCustomer(@Param('id') id: string) {
    return this.useCases.queries.getAdminCustomer({ customerId: id })
  }

  @Get(':id/history')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({
    summary:
      'Get customer full history — subscriptions, delivery records, issues',
  })
  @ApiResponse({ status: 200, description: 'Customer history retrieved' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiParam({ name: 'id', description: 'Customer user ID' })
  @HandleErrors('get-admin-customer-history')
  async getCustomerHistory(@Param('id') id: string) {
    return this.useCases.queries.getAdminCustomerHistory({ customerId: id })
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a customer account (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Customer deactivated' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiParam({ name: 'id', description: 'Customer user ID' })
  @HandleErrors('deactivate-customer')
  async deactivateCustomer(@Param('id') id: string) {
    return this.useCases.commands.deactivateCustomer({ customerId: id })
  }

  @Post(':id/wallet/credit')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Credit customer wallet — mandatory admin note required',
  })
  @ApiResponse({ status: 200, description: 'Wallet credited successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiParam({ name: 'id', description: 'Customer user ID' })
  @HandleErrors('admin-credit-wallet')
  async creditWallet(
    @Param('id') id: string,
    @Body(ValidationPipe) dto: AdminCreditWalletDTO
  ) {
    return this.useCases.commands.adminCreditWallet({
      customerId: id,
      amountSar: dto.amountSar,
      note: dto.note,
    })
  }
}
