import {
    Controller,
    Post,
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
import { JwtAuthGuard, RolesGuard, Roles } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import { CreateDeliveryAreaDTO } from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin Delivery Areas')
@Controller('api/v1/admin/delivery')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminDeliveryController {
    constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

    @Post('areas')
    @Roles(UserRole.ADMIN, UserRole.OPS)
    @ApiOperation({ summary: 'Create Delivery Area' })
    @ApiResponse({ status: 201, description: 'Delivery area created' })
    @HandleErrors('create-delivery-area')
    async createDeliveryArea(
        @Body(ValidationPipe) dto: CreateDeliveryAreaDTO
    ) {
        const result = await this.useCases.commands.createDeliveryArea({
            name: dto.name,
            description: dto.description,
            status: dto.status,
        })
        return result
    }
}
