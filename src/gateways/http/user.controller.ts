import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Inject,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { UpdateProfileDTO, UpdateLanguageDTO, SaveDeliveryLocationDTO } from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('User Profile & Preferences')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
    constructor(@Inject(CoreS) private readonly useCases: UseCases) { }

    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile returned successfully' })
    @HandleErrors('get-profile')
    async getProfile(@CurrentUser() user: UserWithoutPassword) {
        const result = await this.useCases.queries.getProfile({
            userId: user.id,
        })
        return result
    }

    @Post('profile')
    @ApiOperation({ summary: 'Create or update user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    @HandleErrors('update-profile')
    async updateProfile(
        @Body() dto: UpdateProfileDTO,
        @CurrentUser() user: UserWithoutPassword
    ) {
        const result = await this.useCases.commands.updateProfile({
            userId: user.id,
            fullName: dto.fullName,
            email: dto.email,
        })
        return result
    }

    @Patch('preferences/language')
    @ApiOperation({ summary: 'Update app language preference' })
    @ApiResponse({ status: 200, description: 'Language preference updated' })
    @HandleErrors('update-language')
    async updateLanguage(
        @Body() dto: UpdateLanguageDTO,
        @CurrentUser() user: UserWithoutPassword
    ) {
        const result = await this.useCases.commands.updateLanguagePreference({
            userId: user.id,
            language: dto.language,
        })
        return result
    }

    @Post('delivery-location')
    @ApiOperation({ summary: 'Save Delivery Location' })
    @ApiResponse({ status: 201, description: 'Delivery location saved' })
    @HandleErrors('save-delivery-location')
    async saveDeliveryLocation(
        @Body(ValidationPipe) dto: SaveDeliveryLocationDTO,
        @CurrentUser() user: UserWithoutPassword
    ) {
        const result = await this.useCases.commands.saveDeliveryLocation({
            userId: user.id,
            areaId: dto.areaId,
            building: dto.building,
            buildingId: dto.buildingId,
            floor: dto.floor,
            deskArea: dto.deskArea,
            deliveryPreference: dto.deliveryPreference,
            riderNotes: dto.riderNotes,
        })
        return result
    }
}
