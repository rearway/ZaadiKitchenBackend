import {
    Controller,
    Post,
    Body,
    Inject,
    UseGuards,
    Req,
    ValidationPipe,
} from '@nestjs/common'
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger'
import type { Request } from 'express'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { UserRole } from '../../codecs/enums.js'
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
    SendOtpDTO,
    VerifyOtpDTO,
    AdminLoginDTO,
    RefreshTokenDTO,
} from './dto/index.js'

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
    constructor(@Inject(CoreS) private readonly useCases: UseCases) { }

    @Post('otp/send')
    @ApiOperation({ summary: 'Send OTP to phone number (WhatsApp/SMS)' })
    @ApiResponse({ status: 200, description: 'OTP sent successfully' })
    @ApiResponse({ status: 400, description: 'Invalid phone format' })
    @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
    @HandleErrors('send-otp')
    async sendOtp(@Body() dto: SendOtpDTO) {
        const result = await this.useCases.commands.sendOtp({
            phone: dto.phone,
            channel: dto.channel,
        })
        return result
    }

    @Post('otp/verify')
    @ApiOperation({ summary: 'Verify OTP and get auth tokens' })
    @ApiResponse({
        status: 200,
        description: 'OTP verified, tokens issued',
    })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    @HandleErrors('verify-otp')
    async verifyOtp(
        @Body() dto: VerifyOtpDTO,
        @Req() req: Request
    ) {
        const result = await this.useCases.commands.verifyOtp({
            phone: dto.phone,
            code: dto.code,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
        })
        return result
    }

    @Post('admin/login')
    @ApiOperation({ summary: 'Admin login with email and password' })
    @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    @HandleErrors('admin-login')
    async adminLogin(
        @Body() dto: AdminLoginDTO,
        @Req() req: Request
    ) {
        const result = await this.useCases.commands.adminLogin({
            email: dto.email,
            password: dto.password,
            userAgent: req.headers['user-agent'],
            ipAddress: req.ip,
        })
        return result
    }

    @Post('refresh')
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    @HandleErrors('refresh-token')
    async refreshToken(@Body(ValidationPipe) dto: RefreshTokenDTO) {
        const result = await this.useCases.commands.refreshAccessToken({
            refreshToken: dto.refreshToken,
        })
        return result
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout current session' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    @HandleErrors('logout')
    async logout(@Body() dto: RefreshTokenDTO) {
        const result = await this.useCases.commands.logout({
            refreshToken: dto.refreshToken,
        })
        return result
    }

    @Post('admin/logout')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Logout all admin sessions' })
    @ApiResponse({
        status: 200,
        description: 'All admin sessions terminated',
    })
    @HandleErrors('admin-logout')
    async adminLogout(@CurrentUser() user: any) {
        const result = await this.useCases.commands.adminLogout({
            userId: user.id,
        })
        return result
    }
}
