import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Inject,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  StreamableFile,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger'
import type { Response } from 'express'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  GetDailyOpsQueryDTO,
  AdvancePipelineStageDTO,
  GetDeliveryLabelsQueryDTO,
} from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'
import { resolveDeliveryDayFilter } from '../../core/usecases/services/deliveryDayFilterUtils.js'

interface AuthenticatedStaff {
  id: string
  role: string
}

@ApiTags('Ops Daily Operations')
@Controller('api/v1/ops/daily-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OPS)
@ApiBearerAuth('JWT-auth')
export class OpsDailyOpsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'Get the Ops/Kitchen Daily Ops view for a date (no issues queue)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-ops-daily-ops')
  async getDailyOps(@Query(ValidationPipe) query: GetDailyOpsQueryDTO) {
    const resolved = resolveDeliveryDayFilter(
      {
        day: query.day,
        delivery_date: query.delivery_date,
        date: query.date,
      },
      new Date(),
      { restrictToTodayTomorrow: false }
    )
    return this.useCases.queries.getDailyOps({ date: resolved.date, role: 'ops' })
  }

  @Post('pipeline/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance the production pipeline to the next stage (ops)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('advance-pipeline-stage-ops')
  async advancePipelineStage(
    @Body(ValidationPipe) dto: AdvancePipelineStageDTO,
    @CurrentUser() user: AuthenticatedStaff
  ) {
    return this.useCases.commands.advancePipelineStage({
      date: dto.date,
      fromStage: dto.from_stage,
      toStage: dto.to_stage,
      advancedByUserId: user.id,
    })
  }

  @Get('labels')
  @ApiOperation({ summary: 'List delivery labels for a date, grouped by area (ops)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-ops-delivery-labels')
  async getLabels(@Query(ValidationPipe) query: GetDeliveryLabelsQueryDTO) {
    const resolved = resolveDeliveryDayFilter({
      day: query.day,
      delivery_date: query.delivery_date,
      date: query.date,
    })
    const result = await this.useCases.queries.getDeliveryLabels({
      date: resolved.date,
      mealType: query.meal_type,
      areaId: query.area_id,
    })
    return {
      ...result,
      date: resolved.date,
      date_label: resolved.date_label,
      day: resolved.day,
    }
  }

  @Get('labels/download')
  @ApiOperation({ summary: 'Download delivery labels PDF (ops)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('download-ops-delivery-labels')
  async downloadLabels(
    @Query(ValidationPipe) query: GetDeliveryLabelsQueryDTO,
    @Res({ passthrough: true }) res: Response
  ) {
    const resolved = resolveDeliveryDayFilter({
      day: query.day,
      delivery_date: query.delivery_date,
      date: query.date,
    })
    const { buffer, filename } = await this.useCases.queries.generateDeliveryLabelsPdf({
      date: resolved.date,
      mealType: query.meal_type,
      areaId: query.area_id,
      labelId: query.label_id,
    })
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    return new StreamableFile(buffer)
  }
}
