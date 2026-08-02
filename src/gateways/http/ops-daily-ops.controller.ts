import {
  Controller,
  Get,
  Post,
  Body,
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
import { GetDailyOpsQueryDTO, AdvancePipelineStageDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

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
    return this.useCases.queries.getDailyOps({ date: query.date, role: 'ops' })
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
}
