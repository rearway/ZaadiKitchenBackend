import { IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateMealStatusDTO {
  @ApiProperty({ enum: ['active', 'draft'] })
  @IsEnum(['active', 'draft'])
  status: 'active' | 'draft'

  @ApiPropertyOptional({
    description:
      'Required when activating an updated meal (applies pending edits to the live menu) or drafting a meal that is on a published week. The admin UI should show a confirm popup first, then retry with this flag.',
  })
  @IsOptional()
  @IsBoolean()
  confirm_published_edit?: boolean
}
