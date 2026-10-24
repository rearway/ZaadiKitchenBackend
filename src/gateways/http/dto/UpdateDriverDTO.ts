import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDriverDTO {
  @ApiPropertyOptional({ example: 'Faisal Al-Harbi' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  full_name?: string

  @ApiPropertyOptional({
    example: '+966512345678',
    description:
      'Replacement OTP phone. Must be allowed by the auth phone rules.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional({
    description:
      'When false, the driver cannot sign in and the rider list is empty.',
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean

  @ApiPropertyOptional({
    type: [String],
    description:
      'Replaces the full area assignment. Send [] to clear. Omit to leave unchanged.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  area_ids?: string[]
}
