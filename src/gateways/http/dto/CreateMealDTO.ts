import { IsString, IsOptional, IsInt, IsPositive, IsNumber, IsArray, Length, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

class MacrosDTO {
  @ApiPropertyOptional() @IsOptional() @IsNumber() protein_g?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() carbs_g?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() fat_g?: number
}

export class CreateMealDTO {
  @ApiProperty({ example: 'Lamb Kabsa' })
  @IsString()
  @Length(1, 80)
  name_en: string

  @ApiPropertyOptional({ example: 'كبسة لحم' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name_ar?: string

  @ApiProperty({ enum: ['executive', 'salad'] })
  @IsEnum(['executive', 'salad'])
  meal_type: 'executive' | 'salad'

  @ApiProperty({ example: 550 })
  @IsInt()
  @IsPositive()
  kcal: number

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => MacrosDTO)
  macros?: MacrosDTO

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chef_note?: string

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  key_ingredients?: string[]

  @ApiPropertyOptional({ example: '🍛' })
  @IsOptional()
  @IsString()
  emoji?: string
}
