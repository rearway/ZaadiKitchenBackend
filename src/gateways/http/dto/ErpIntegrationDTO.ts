import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class ErpPaginationQueryDTO {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}

export class ErpPaymentsBodyDTO extends ErpPaginationQueryDTO {
  @IsString()
  dateFrom!: string

  @IsString()
  dateTo!: string
}

export class ErpDailyOrdersBodyDTO extends ErpPaginationQueryDTO {
  @IsOptional()
  @IsString()
  date?: string
}
