import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsArray,
  Matches,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SwitchMealTypeDTO {
  @ApiProperty({ example: 'salad', enum: ['executive', 'salad'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['executive', 'salad'])
  meal_type!: 'executive' | 'salad'

  @ApiProperty({ example: 'all', enum: ['all', 'specific'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['all', 'specific'])
  apply_to!: 'all' | 'specific'

  @ApiPropertyOptional({
    example: ['2025-05-13', '2025-05-14'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    each: true,
    message: 'Each date must be YYYY-MM-DD',
  })
  specific_days?: string[]
}
