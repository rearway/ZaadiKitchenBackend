import { IsString, IsIn, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AdvancePipelineStageDTO {
  @ApiProperty({ example: '2026-08-02' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date: string

  @ApiProperty({ enum: ['locked', 'dispatch'] })
  @IsIn(['locked', 'dispatch'])
  from_stage: 'locked' | 'dispatch'

  @ApiProperty({ enum: ['dispatch', 'delivered'] })
  @IsIn(['dispatch', 'delivered'])
  to_stage: 'dispatch' | 'delivered'
}
