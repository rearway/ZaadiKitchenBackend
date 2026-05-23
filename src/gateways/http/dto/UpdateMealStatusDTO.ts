import { IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateMealStatusDTO {
  @ApiProperty({ enum: ['active', 'draft'] })
  @IsEnum(['active', 'draft'])
  status: 'active' | 'draft'

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  confirm_published_edit?: boolean
}
