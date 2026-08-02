import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  UpdateProfileDTO,
  UpdateLanguageDTO,
  SaveDeliveryLocationDTO,
  UpdateDeliveryLocationDTO,
} from './dto/index.js'
import type { UserWithoutPassword } from '../../core/entities/index.js'

@ApiTags('User Profile & Preferences')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UserController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

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
      gate: dto.gate,
      deliveryPreference: dto.deliveryPreference,
      riderNotes: dto.riderNotes,
    })
    return result
  }

  @Patch('delivery-location/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Edit a saved delivery location' })
  @ApiResponse({ status: 200, description: 'Delivery location updated' })
  @HandleErrors('update-delivery-location')
  async updateDeliveryLocation(
    @Param('id') locationId: string,
    @Body(ValidationPipe) dto: UpdateDeliveryLocationDTO,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.updateDeliveryLocation({
      userId: user.id,
      locationId,
      areaId: dto.areaId,
      buildingId: dto.buildingId,
      building: dto.building,
      floor: dto.floor,
      deskArea: dto.deskArea,
      gate: dto.gate,
      deliveryPreference: dto.deliveryPreference,
      riderNotes: dto.riderNotes,
    })
  }

  @Delete('delivery-location/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a saved delivery location' })
  @ApiResponse({ status: 200, description: 'Delivery location deleted' })
  @HandleErrors('delete-delivery-location')
  async deleteDeliveryLocation(
    @Param('id') locationId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.deleteDeliveryLocation({
      userId: user.id,
      locationId,
    })
  }

  @Patch('delivery-location/:id/primary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set an address as the primary delivery location' })
  @ApiResponse({ status: 200, description: 'Primary location updated' })
  @HandleErrors('set-primary-delivery-location')
  async setPrimaryDeliveryLocation(
    @Param('id') locationId: string,
    @CurrentUser() user: UserWithoutPassword
  ) {
    return this.useCases.commands.setPrimaryDeliveryLocation({
      userId: user.id,
      locationId,
    })
  }

  @Get('delivery-location')
  @ApiOperation({ summary: 'Get saved delivery location' })
  @ApiResponse({
    status: 200,
    description: 'Delivery location retrieved successfully',
  })
  @HandleErrors('get-delivery-location')
  async getDeliveryLocation(@CurrentUser() user: UserWithoutPassword) {
    const result = await this.useCases.queries.getSavedDeliveryLocation({
      userId: user.id,
    })
    return result
  }

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance returned' })
  @HandleErrors('get-wallet')
  async getWallet(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getWallet({ userId: user.id })
  }

  @Get('wallet/transactions')
  @ApiOperation({ summary: 'Get wallet transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'per_page', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Transactions returned' })
  @HandleErrors('get-wallet-transactions')
  async getWalletTransactions(
    @CurrentUser() user: UserWithoutPassword,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string
  ) {
    return this.useCases.queries.getWalletTransactions({
      userId: user.id,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    })
  }

  @Get('referral')
  @ApiOperation({
    summary: 'Get referral code and stats (alias for GET /referrals/me)',
  })
  @ApiResponse({ status: 200, description: 'Referral stats returned' })
  @HandleErrors('get-referral-user')
  async getReferral(@CurrentUser() user: UserWithoutPassword) {
    return this.useCases.queries.getReferral({ userId: user.id })
  }
}
