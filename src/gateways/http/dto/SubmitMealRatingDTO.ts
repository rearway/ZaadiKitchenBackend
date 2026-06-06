import { IsInt, Min, Max, IsOptional, IsArray, IsString, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SubmitMealRatingDTO {
  @ApiProperty({ description: 'The delivery day ID being rated', format: 'uuid' })
  @IsUUID()
  deliveryDayId: string

  @ApiProperty({ description: 'Star rating 1–5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number

  @ApiPropertyOptional({
    description: 'Optional feedback tags',
    example: ['Great portion', 'Too spicy'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[]
}
