import { IsString, IsOptional, IsInt, IsPositive, IsNumber, IsArray, Length, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

class MacrosDTO {
  @ApiPropertyOptional() @IsOptional() @IsNumber() protein_g?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() carbs_g?: number
  @ApiPropertyOptional() @IsOptional() @IsNumber() fat_g?: number
}

export class UpdateMealDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name_en?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name_ar?: string

  @ApiPropertyOptional({ enum: ['executive', 'salad'] })
  @IsOptional()
  @IsEnum(['executive', 'salad'])
  meal_type?: 'executive' | 'salad'

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @IsPositive()
  kcal?: number

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emoji?: string

  @ApiPropertyOptional()
  @IsOptional()
  confirm_published_edit?: boolean
}
