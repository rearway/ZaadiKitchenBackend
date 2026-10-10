const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** e.g. "Apr 2025" for subscription billing title suffix */
export function formatBillingPlanPeriod(date: Date): string {
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

/** e.g. "Apr 3, 2025" */
export function formatBillingShortDate(date: Date): string {
  return `${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}
