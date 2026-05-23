import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger'

import { CoreS } from '../../tokens.js'
import type { UseCases } from '../../core/usecases/index.js'
import { JwtAuthGuard, RolesGuard, Roles } from '../../infrastructure/Auth/index.js'
import { HandleErrors } from '../../shared/decorators/index.js'
import {
  GetAdminMealsQueryDTO,
  CreateMealDTO,
  UpdateMealDTO,
  UpdateMealStatusDTO,
} from './dto/index.js'
import { UserRole } from '../../codecs/enums.js'

@ApiTags('Admin Meals')
@Controller('api/v1/admin/meals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.OPS)
@ApiBearerAuth('JWT-auth')
export class AdminMealsController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Get()
  @ApiOperation({ summary: 'List meals (admin)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-admin-meals')
  async getMeals(@Query(ValidationPipe) query: GetAdminMealsQueryDTO) {
    return this.useCases.queries.getAdminMeals({
      status: query.status,
      mealType: query.meal_type,
      q: query.q,
      page: query.page,
      perPage: query.per_page,
      context: query.context,
      excludeWeekId: query.exclude_week_id,
    })
  }

  @Get(':meal_id')
  @ApiOperation({ summary: 'Get meal detail (admin)' })
  @ApiResponse({ status: 200 })
  @HandleErrors('get-admin-meal')
  async getMeal(@Param('meal_id') mealId: string) {
    return this.useCases.queries.getAdminMeal({ mealId })
  }

  @Post()
  @ApiOperation({ summary: 'Create meal (always draft)' })
  @ApiResponse({ status: 201 })
  @HandleErrors('create-meal')
  async createMeal(@Body(ValidationPipe) dto: CreateMealDTO) {
    return this.useCases.commands.createMeal({
      nameEn: dto.name_en,
      nameAr: dto.name_ar,
      mealType: dto.meal_type,
      kcal: dto.kcal,
      proteinG: dto.macros?.protein_g,
      carbsG: dto.macros?.carbs_g,
      fatG: dto.macros?.fat_g,
      chefNote: dto.chef_note,
      keyIngredients: dto.key_ingredients,
      emoji: dto.emoji,
    })
  }

  @Patch(':meal_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update meal fields' })
  @ApiResponse({ status: 200 })
  @HandleErrors('update-meal')
  async updateMeal(
    @Param('meal_id') mealId: string,
    @Body(ValidationPipe) dto: UpdateMealDTO
  ) {
    return this.useCases.commands.updateMeal({
      mealId,
      nameEn: dto.name_en,
      nameAr: dto.name_ar,
      kcal: dto.kcal,
      proteinG: dto.macros?.protein_g,
      carbsG: dto.macros?.carbs_g,
      fatG: dto.macros?.fat_g,
      chefNote: dto.chef_note,
      keyIngredients: dto.key_ingredients,
      emoji: dto.emoji,
      confirmPublishedEdit: dto.confirm_published_edit,
    })
  }

  @Patch(':meal_id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate or draft a meal' })
  @ApiResponse({ status: 200 })
  @HandleErrors('update-meal-status')
  async updateStatus(
    @Param('meal_id') mealId: string,
    @Body(ValidationPipe) dto: UpdateMealStatusDTO
  ) {
    return this.useCases.commands.updateMealStatus({
      mealId,
      status: dto.status,
      confirmPublishedEdit: dto.confirm_published_edit,
    })
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Bulk import meals from XLSX' })
  @ApiResponse({ status: 201 })
  @HandleErrors('import-meals')
  async importMeals(@UploadedFile() file: Express.Multer.File) {
    return this.useCases.commands.importMeals({
      fileBuffer: file.buffer,
      filename: file.originalname,
    })
  }
}
