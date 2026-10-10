import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { ErpApiKeyGuard } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  ErpPaginationQueryDTO,
  ErpPaymentsBodyDTO,
  ErpDailyOrdersBodyDTO,
} from './dto/ErpIntegrationDTO.js'

@ApiTags('ERP Integration')
@ApiSecurity('ApiKey')
@Controller('api/v1/integrations/erp')
@UseGuards(ErpApiKeyGuard)
export class ErpIntegrationController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('menus')
  @ApiOperation({ summary: 'ERP — live menu catalog' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-erp-menus')
  async getMenus(@Query(ValidationPipe) query: ErpPaginationQueryDTO) {
    return this.useCases.queries.getErpMenus({
      offset: query.offset,
      limit: query.limit,
    })
  }

  @Get('customers')
  @ApiOperation({ summary: 'ERP — live customer list' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-erp-customers')
  async getCustomers(@Query(ValidationPipe) query: ErpPaginationQueryDTO) {
    return this.useCases.queries.getErpCustomers({
      offset: query.offset,
      limit: query.limit,
    })
  }

  @Post('payments')
  @ApiOperation({ summary: 'ERP — payments by date range' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-erp-payments')
  async getPayments(@Body(ValidationPipe) body: ErpPaymentsBodyDTO) {
    return this.useCases.queries.getErpPayments({
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      offset: body.offset,
      limit: body.limit,
    })
  }

  @Post('daily-orders')
  @ApiOperation({ summary: 'ERP — daily production orders' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-erp-daily-orders')
  async getDailyOrders(@Body(ValidationPipe) body: ErpDailyOrdersBodyDTO) {
    return this.useCases.queries.getErpDailyOrders({
      date: body.date,
      offset: body.offset,
      limit: body.limit,
    })
  }
}
