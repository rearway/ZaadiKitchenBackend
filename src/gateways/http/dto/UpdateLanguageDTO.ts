import { IsString, IsNotEmpty, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export enum AppLanguage {
    EN = 'EN',
    AR = 'AR',
}

export class UpdateLanguageDTO {
    @ApiProperty({
        description: 'Language preference',
        enum: AppLanguage,
        example: 'AR',
    })
    @IsNotEmpty()
    @IsEnum(AppLanguage, {
        message: 'Only EN and AR are supported',
    })
    language: AppLanguage
}
