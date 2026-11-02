export type MealTypeSlug = 'executive' | 'salad'

export interface MealTypeDisplay {
  slug: MealTypeSlug
  name_en: string
  name_ar: string
  short_en: string
  short_ar: string
  sort: number
}

/** Used when `app_settings.meal_types` is missing, empty, or invalid. */
export const DEFAULT_MEAL_TYPES: MealTypeDisplay[] = [
  {
    slug: 'executive',
    name_en: 'Platio Balanced',
    name_ar: 'Platio متوازن',
    short_en: 'Balanced',
    short_ar: 'متوازن',
    sort: 1,
  },
  {
    slug: 'salad',
    name_en: 'Platio Light',
    name_ar: 'Platio لايت',
    short_en: 'Light',
    short_ar: 'لايت',
    sort: 2,
  },
]

let activeMealTypes: MealTypeDisplay[] = DEFAULT_MEAL_TYPES

export function currentMealTypeDisplays(): MealTypeDisplay[] {
  return activeMealTypes
}

export function applyMealTypeDisplays(displays: MealTypeDisplay[]): void {
  activeMealTypes = displays
}

export function resetMealTypeDisplays(): void {
  activeMealTypes = DEFAULT_MEAL_TYPES
}

function isSlug(value: unknown): value is MealTypeSlug {
  return value === 'executive' || value === 'salad'
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

/**
 * Accepts the `meal_types` JSON value. Unknown slugs are ignored.
 * A missing slug is filled from the defaults. Returns null when nothing valid is present.
 */
export function parseMealTypes(value: unknown): MealTypeDisplay[] | null {
  const raw = typeof value === 'string' ? parseJson(value) : value
  if (!Array.isArray(raw)) return null

  const parsed: MealTypeDisplay[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (!isSlug(row.slug)) continue
    const nameEn = asNonEmptyString(row.name_en)
    const nameAr = asNonEmptyString(row.name_ar)
    const shortEn = asNonEmptyString(row.short_en)
    const shortAr = asNonEmptyString(row.short_ar)
    const sort =
      typeof row.sort === 'number' && Number.isFinite(row.sort) ? row.sort : null
    if (!nameEn || !nameAr || !shortEn || !shortAr || sort == null) continue
    parsed.push({
      slug: row.slug,
      name_en: nameEn,
      name_ar: nameAr,
      short_en: shortEn,
      short_ar: shortAr,
      sort,
    })
  }

  if (parsed.length === 0) return null
  const bySlug = new Map(parsed.map(item => [item.slug, item]))
  return DEFAULT_MEAL_TYPES.map(item => bySlug.get(item.slug) ?? item).sort(
    (a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug)
  )
}

function displayFor(
  slug: string,
  displays: MealTypeDisplay[]
): MealTypeDisplay | undefined {
  return (
    displays.find(item => item.slug === slug) ??
    DEFAULT_MEAL_TYPES.find(item => item.slug === slug)
  )
}

export function mealTypeNameEn(
  slug: string,
  displays: MealTypeDisplay[] = currentMealTypeDisplays()
): string {
  return displayFor(slug, displays)?.name_en ?? 'Platio Balanced'
}

export function mealTypeShortEn(
  slug: string,
  displays: MealTypeDisplay[] = currentMealTypeDisplays()
): string {
  return displayFor(slug, displays)?.short_en ?? 'Balanced'
}

export function mealTypePlanLabel(
  slug: string,
  displays: MealTypeDisplay[] = currentMealTypeDisplays()
): string {
  return `${mealTypeNameEn(slug, displays)} Plan`
}
