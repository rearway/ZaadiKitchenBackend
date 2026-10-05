import { ValidationError } from '../../../shared/errors/domain.errors.js'

/** Parse DD/MM/YYYY or YYYY-MM-DD to YYYY-MM-DD. */
export function parseErpDateInput(value: string, fieldName: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new ValidationError(`${fieldName} is required`)
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`
  }

  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed)
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
  }

  throw new ValidationError(`${fieldName} must be DD/MM/YYYY or YYYY-MM-DD`)
}

export function clampPagination(offset?: number, limit?: number): { offset: number; limit: number } {
  const safeOffset = Math.max(0, offset ?? 0)
  const safeLimit = Math.min(Math.max(1, limit ?? 50), 100)
  return { offset: safeOffset, limit: safeLimit }
}
