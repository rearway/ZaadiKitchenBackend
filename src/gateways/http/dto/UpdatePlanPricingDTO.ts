import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdatePlanPricingDTO {
  @ApiPropertyOptional({
    description: 'Actual price charged at checkout (SAR)',
    example: 50,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price_sar?: number

  @ApiPropertyOptional({
    description:
      'Original price shown struck-through in the app (SAR). Must be >= price_sar. Send null to remove the discount.',
    example: 100,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  max_price_sar?: number | null
}
