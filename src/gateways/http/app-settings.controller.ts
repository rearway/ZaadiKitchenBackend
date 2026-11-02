import { Controller, Get, Inject, Query, Req, Res, ValidationPipe } from '@nestjs/common'
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  appSettingsEtag,
  ifNoneMatchSatisfied,
} from '../../core/usecases/services/appSettingsPayload.js'
import { GetAppSettingsQueryDTO } from './dto/GetAppSettingsQueryDTO.js'

@ApiTags('App')
@Controller('api/v1/app')
export class AppSettingsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get('settings')
  @ApiOperation({
    summary: 'Public app settings (no JWT). Meal slugs stay executive and salad.',
  })
  @ApiQuery({ name: 'platform', required: false, enum: ['ios', 'android'] })
  @ApiQuery({ name: 'app_version', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Settings bundle. Cache-Control max-age=300.' })
  @ApiResponse({ status: 304, description: 'Not modified' })
  @HandleErrors('get-app-settings')
  async getSettings(
    @Query(ValidationPipe) query: GetAppSettingsQueryDTO,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const body = await this.useCases.queries.getAppSettings({
      platform: query.platform,
      appVersion: query.app_version,
    })
    const etag = appSettingsEtag(body)
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('ETag', etag)
    if (ifNoneMatchSatisfied(req.headers['if-none-match'], etag)) {
      res.status(304)
      return
    }
    return body
  }
}
