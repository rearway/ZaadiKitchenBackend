import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SaveDeliveryLocationDTO {
  @ApiProperty({
    description: 'Must be a valid active area ID',
  })
  @IsUUID()
  @IsNotEmpty()
  areaId: string

  @ApiProperty({
    description: 'Building name. Max 200 characters',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  building: string

  @ApiPropertyOptional({
    description: 'If building was selected from suggestion list',
  })
  @IsOptional()
  @IsUUID()
  buildingId?: string

  @ApiPropertyOptional({
    description: 'Floor level',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string

  @ApiPropertyOptional({
    description: 'Desk area',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deskArea?: string

  @ApiPropertyOptional({
    description: 'Delivery preference',
    enum: ['hand_to_me', 'reception'],
    default: 'hand_to_me',
  })
  @IsOptional()
  @IsEnum(['hand_to_me', 'reception'])
  deliveryPreference?: 'hand_to_me' | 'reception'

  @ApiPropertyOptional({
    description: 'Notes for the rider',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  riderNotes?: string
}
