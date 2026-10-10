import type { Deps } from '../../entitygateway/index.js'
import type { CreateMealInput, ImportError } from '../../entitygateway/Meal.js'
import { ValidationError } from '../../../shared/errors/domain.errors.js'

export interface ImportMealsInput {
  fileBuffer: Buffer
  filename: string
}

export interface ImportMealsOutput {
  imported_count: number
  skipped_count: number
  errors: ImportError[]
  all_saved_as: 'draft'
  note: string
}

const VALID_MEAL_TYPES = ['executive', 'salad'] as const
const MAX_ROWS = 100

export function makeUC(deps: Deps) {
  return async function importMeals(input: ImportMealsInput): Promise<ImportMealsOutput> {
    const { logger, mealPersistor } = deps

    try {
      // Dynamic import to keep xlsx out of core compilation path
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(input.fileBuffer, { type: 'buffer' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new ValidationError('XLSX file has no sheets.')

      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null })

      if (rows.length > MAX_ROWS) {
        throw new ValidationError(`Import is limited to ${MAX_ROWS} rows. File has ${rows.length}.`)
      }

      const toCreate: CreateMealInput[] = []
      const errors: ImportError[] = []

      rows.forEach((row, idx) => {
        const rowNum = idx + 2  // 1-based + header
        const get = (key: string) => {
          const k = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase())
          return k ? row[k] : undefined
        }

        const nameEn = String(get('name_en') ?? '').trim()
        const mealType = String(get('meal_type') ?? '').trim().toLowerCase()
        const kcalRaw = get('kcal')
        const kcal = kcalRaw !== null && kcalRaw !== undefined ? Number(kcalRaw) : NaN

        if (!nameEn) {
          errors.push({ row: rowNum, field: 'name_en', message: 'name_en is required.' })
          return
        }
        if (!VALID_MEAL_TYPES.includes(mealType as 'executive' | 'salad')) {
          errors.push({ row: rowNum, field: 'meal_type', message: `Invalid meal_type '${mealType}'. Must be 'executive' or 'salad'.` })
          return
        }
        if (isNaN(kcal) || kcal <= 0) {
          errors.push({ row: rowNum, field: 'kcal', message: 'kcal must be a positive integer.' })
          return
        }

        const ingredientsRaw = get('key_ingredients')
        const keyIngredients = ingredientsRaw
          ? String(ingredientsRaw).split(',').map(s => s.trim()).filter(Boolean)
          : undefined

        toCreate.push({
          nameEn,
          nameAr: get('name_ar') ? String(get('name_ar')).trim() : undefined,
          mealType: mealType as 'executive' | 'salad',
          kcal: Math.round(kcal),
          proteinG: get('protein_g') ? Number(get('protein_g')) : undefined,
          carbsG: get('carbs_g') ? Number(get('carbs_g')) : undefined,
          fatG: get('fat_g') ? Number(get('fat_g')) : undefined,
          chefNote: get('chef_note') ? String(get('chef_note')).trim() : undefined,
          keyIngredients,
          emoji: get('emoji') ? String(get('emoji')).trim() : undefined,
        })
      })

      const result = await mealPersistor.bulkCreateMeals(toCreate)

      return {
        imported_count: result.created.length,
        skipped_count: result.skipped + errors.length,
        errors: [...errors, ...result.errors],
        all_saved_as: 'draft',
        note: 'Photos must be uploaded manually. No auto-activation.',
      }
    } catch (error) {
      logger.error('ImportMeals failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'ImportMeals'
