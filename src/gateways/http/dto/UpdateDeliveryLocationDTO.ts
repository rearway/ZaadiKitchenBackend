import { IsString, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateDeliveryLocationDTO {
  @ApiPropertyOptional({ description: 'Area ID (if changing area)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  areaId?: string

  @ApiPropertyOptional({ description: 'Building ID from admin-curated list', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  buildingId?: string

  @ApiPropertyOptional({ description: 'Free-text building name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  building?: string

  @ApiPropertyOptional({ description: 'Floor level', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string

  @ApiPropertyOptional({ description: 'Desk area', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deskArea?: string

  @ApiPropertyOptional({ enum: ['hand_to_me', 'reception'] })
  @IsOptional()
  @IsEnum(['hand_to_me', 'reception'])
  deliveryPreference?: 'hand_to_me' | 'reception'

  @ApiPropertyOptional({ description: 'Notes for the rider', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  riderNotes?: string
}
