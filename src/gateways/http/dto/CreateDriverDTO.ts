import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateDriverDTO {
  @ApiProperty({ example: 'Faisal Al-Harbi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  full_name: string

  @ApiProperty({
    example: '+966512345678',
    description: 'Phone the driver uses for OTP sign-in. Saudi +966XXXXXXXXX.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string

  @ApiPropertyOptional({
    type: [String],
    description:
      'Delivery area ids this driver covers. Omit or send [] for none.',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  area_ids?: string[]
}
