import { IsString, IsNotEmpty, IsIn } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class CreateCheckoutSessionDTO {
  @ApiProperty({
    example: 'month',
    enum: ['try_it', 'week', 'month', 'quarterly'],
  })
  @IsString()
  @IsNotEmpty()
  plan_id!: string

  @ApiProperty({ example: 'executive', enum: ['executive', 'salad'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['executive', 'salad'])
  meal_type!: 'executive' | 'salad'
}
