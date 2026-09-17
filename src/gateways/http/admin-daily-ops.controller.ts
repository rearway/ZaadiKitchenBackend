import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  CreditDeliveryIssueDTO,
  RejectDeliveryIssueDTO,
  GetDeliveryLabelsQueryDTO,
} from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'
import { resolveDeliveryDayFilter } from '../../core/usecases/services/deliveryDayFilterUtils.js'

interface AuthenticatedStaff {
  id: string
  role: string
}

@ApiTags('Admin Daily Operations')
@Controller('api/v1/admin/daily-ops')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDailyOpsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get the Daily Ops view for a date (pipeline, meal breakdown, issues queue)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-admin-daily-ops')
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
    return this.useCases.queries.getDailyOps({ date: resolved.date, role: 'admin' })
  }

  @Post('pipeline/advance')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance the production pipeline to the next stage' })
  @ApiResponse({ status: 200 })
  @HandleErrors('advance-pipeline-stage')
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

  @Get('issues')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List open delivery issues for a date' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-daily-ops-issues')
  async getIssues(@Query(ValidationPipe) query: GetDailyOpsQueryDTO) {
    const resolved = resolveDeliveryDayFilter(
      {
        day: query.day,
        delivery_date: query.delivery_date,
        date: query.date,
      },
      new Date(),
      { restrictToTodayTomorrow: false }
    )
    const result = await this.useCases.queries.getDailyOps({
      date: resolved.date,
      role: 'admin',
      issuesStatus: query.status,
    })
    return result.issues_queue
  }

  @Post('issues/:issue_id/credit')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve a delivery issue with a wallet credit' })
  @ApiResponse({ status: 200 })
  @HandleErrors('credit-delivery-issue')
  async creditIssue(
    @Param('issue_id') issueId: string,
    @Body(ValidationPipe) dto: CreditDeliveryIssueDTO,
    @CurrentUser() user: AuthenticatedStaff
  ) {
    return this.useCases.commands.creditDeliveryIssue({
      issueId,
      creditSar: dto.credit_sar,
      note: dto.note,
      resolvedByUserId: user.id,
    })
  }

  @Post('issues/:issue_id/reject')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a delivery issue without a credit' })
  @ApiResponse({ status: 200 })
  @HandleErrors('reject-delivery-issue')
  async rejectIssue(
    @Param('issue_id') issueId: string,
    @Body(ValidationPipe) dto: RejectDeliveryIssueDTO,
    @CurrentUser() user: AuthenticatedStaff
  ) {
    return this.useCases.commands.rejectDeliveryIssue({
      issueId,
      reason: dto.reason,
      note: dto.note,
      resolvedByUserId: user.id,
    })
  }

  @Get('labels')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'List delivery labels for a date, grouped by area' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-delivery-labels')
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
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: 'Download delivery labels as a PDF (bulk, filtered, per-area, or single label)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('download-delivery-labels')
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

  @Get('export')
  @Roles(UserRole.ADMIN, UserRole.OPS)
  @ApiOperation({ summary: "Export a delivery sheet as XLSX (today or tomorrow via day filter)" })
  @ApiResponse({ status: 200 })
  @HandleErrors('export-delivery-sheet')
  async exportDeliverySheet(
    @Query(ValidationPipe) query: GetDailyOpsQueryDTO,
    @Res({ passthrough: true }) res: Response
  ) {
    const resolved = resolveDeliveryDayFilter({
      day: query.day,
      delivery_date: query.delivery_date,
      date: query.date,
    })
    const { buffer, filename } = await this.useCases.queries.generateDeliverySheetExport({
      date: resolved.date,
    })
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    })
    return new StreamableFile(buffer)
  }
}
