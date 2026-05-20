import { IsString, MinLength } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class SearchDeliveryAreasDTO {
    @ApiProperty({
        description: 'Search string (partial area name)',
        example: 'nakheel',
    })
    @IsString()
    @MinLength(1)
    q: string
}
