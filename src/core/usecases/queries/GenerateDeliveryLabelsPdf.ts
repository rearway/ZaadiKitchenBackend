import type { Deps } from '../../entitygateway/index.js'
import type { RiderDeliveryRow } from '../../entitygateway/DeliveryDay.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'
import type { LabelMealTypeFilter } from './GetDeliveryLabels.js'

export interface GenerateDeliveryLabelsPdfInput {
  date?: string
  mealType?: LabelMealTypeFilter
  areaId?: string
  labelId?: string
}

export interface GenerateDeliveryLabelsPdfOutput {
  buffer: Buffer
  filename: string
}

// 100mm x 60mm thermal label, in PDF points (1mm = 2.8346456693pt)
const MM_TO_PT = 2.8346456693
const LABEL_WIDTH = 100 * MM_TO_PT
const LABEL_HEIGHT = 60 * MM_TO_PT

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

type LabelRow = RiderDeliveryRow & { orderRef: string }

function drawLabel(doc: PDFKit.PDFDocument, row: LabelRow, date: string): void {
  const bandColor = row.mealType === 'executive' ? '#E4572E' : '#3A8C43'

  doc.rect(0, 0, LABEL_WIDTH, 22).fill(bandColor)
  doc.fillColor('#FFFFFF').fontSize(9).text('ZAADI KITCHEN', 8, 6)
  doc.fillColor('#FFFFFF').fontSize(8).text(row.mealType === 'executive' ? 'EXECUTIVE' : 'SALAD', 8, 6, {
    width: LABEL_WIDTH - 16,
    align: 'right',
  })

  doc.fillColor('#000000')
  doc.fontSize(13).text(row.customerName, 8, 30, { width: LABEL_WIDTH - 16 })

  const addressLine = [row.buildingName, row.floor, row.deskArea].filter(Boolean).join(' · ')
  doc.fontSize(9).text(addressLine || '—', 8, 50, { width: LABEL_WIDTH - 16 })

  if (row.gate) {
    doc.fontSize(8).text(`Gate: ${row.gate}`, 8, 64, { width: LABEL_WIDTH - 16 })
  }

  doc.fontSize(8).text(
    row.deliveryPreference === 'reception' ? 'Leave at reception' : 'Hand to customer',
    8,
    78
  )
  doc.fontSize(8).text(`Delivery date: ${date}`, 8, 92)
  doc.fontSize(7).text(row.orderRef, 8, LABEL_HEIGHT - 14)
}

export function makeUC(deps: Deps) {
  return async function generateDeliveryLabelsPdf(
    input: GenerateDeliveryLabelsPdfInput
  ): Promise<GenerateDeliveryLabelsPdfOutput> {
    const { logger, deliveryDayLoader } = deps

    try {
      const date = input.date ?? todayIsoDate()
      const mealType = input.mealType ?? 'all'

      const allRows = await deliveryDayLoader.getRiderDeliveriesByDate(date, input.areaId)
      const filteredRows = mealType === 'all' ? allRows : allRows.filter(r => r.mealType === mealType)
      const withRef: LabelRow[] = filteredRows.map((r, i) => ({
        ...r,
        orderRef: `#ZK-${date}-${String(i + 1).padStart(4, '0')}`,
      }))

      let toRender = withRef
      if (input.labelId) {
        const match = withRef.find(r => r.deliveryDayId === input.labelId)
        if (!match) throw new ResourceNotFoundError('Label', input.labelId)
        toRender = [match]
      }

      const { default: PDFDocument } = await import('pdfkit')
      const doc = new PDFDocument({ size: [LABEL_WIDTH, LABEL_HEIGHT], margin: 0 })
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk as Buffer))
      const finished = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
      })

      if (toRender.length === 0) {
        doc.fontSize(10).text('No deliveries match this filter.', 8, 8)
      } else {
        toRender.forEach((row, index) => {
          if (index > 0) doc.addPage({ size: [LABEL_WIDTH, LABEL_HEIGHT], margin: 0 })
          drawLabel(doc, row, date)
        })
      }
      doc.end()

      const buffer = await finished
      const filename = input.labelId
        ? `zaadi-label-${input.labelId}.pdf`
        : `zaadi-labels-${date}-${mealType}.pdf`

      return { buffer, filename }
    } catch (error) {
      logger.error('GenerateDeliveryLabelsPdf failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GenerateDeliveryLabelsPdf'
