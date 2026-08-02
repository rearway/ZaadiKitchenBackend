import type { Deps } from '../../entitygateway/index.js'

export interface GenerateDeliverySheetExportInput {
  date?: string
}

export interface GenerateDeliverySheetExportOutput {
  buffer: Buffer
  filename: string
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function makeUC(deps: Deps) {
  return async function generateDeliverySheetExport(
    input: GenerateDeliverySheetExportInput
  ): Promise<GenerateDeliverySheetExportOutput> {
    const { logger, deliveryDayLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()
      const rows = await deliveryDayLoader.getRiderDeliveriesByDate(date)

      // Dynamic import to keep xlsx out of the core compilation path (same pattern as ImportMeals.ts)
      const XLSX = await import('xlsx')

      const sheetRows = rows.map(r => ({
        'Customer Name': r.customerName,
        Building: r.buildingName ?? '',
        Floor: r.floor ?? '',
        'Desk/Area': r.deskArea ?? '',
        Gate: r.gate ?? '',
        'Meal Type': r.mealType === 'executive' ? 'Executive' : 'Salad',
        'Rider Notes': r.riderNotes ?? '',
      }))

      const worksheet = XLSX.utils.json_to_sheet(sheetRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Deliveries')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

      return { buffer, filename: `zaadi-delivery-sheet-${date}.xlsx` }
    } catch (error) {
      logger.error('GenerateDeliverySheetExport failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GenerateDeliverySheetExport'
