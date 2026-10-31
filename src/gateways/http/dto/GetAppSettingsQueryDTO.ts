import { IsOptional, IsString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class GetAppSettingsQueryDTO {
  @ApiPropertyOptional({ enum: ['ios', 'android'] })
  @IsOptional()
  @IsString()
  platform?: string

  @ApiPropertyOptional({
    description: 'Installed app version, semver (for example 1.2.0)',
  })
  @IsOptional()
  @IsString()
  app_version?: string
}
