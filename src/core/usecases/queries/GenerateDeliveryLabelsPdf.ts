import path from 'node:path'
import type { Deps } from '../../entitygateway/index.js'
import type { RiderDeliveryRow } from '../../entitygateway/DeliveryDay.js'
import { ResourceNotFoundError } from '../../../shared/errors/index.js'
import {
  mealTypeNameEn,
  mealTypeShortEn,
  type MealTypeDisplay,
} from '../../../shared/meal-display.js'
import type { LabelMealTypeFilter } from './GetDeliveryLabels.js'
import { todayKSA } from '../services/revenueUtils.js'
import { loadMealTypeDisplays } from '../services/mealDisplayNames.js'

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
const MARGIN = 8
const CONTENT_WIDTH = LABEL_WIDTH - MARGIN * 2
const BADGE_PADDING_X = 6
/** Text width that still fits inside the 100mm label after badge padding. */
export const MEAL_BADGE_MAX_TEXT_PT = CONTENT_WIDTH - BADGE_PADDING_X * 2

const ASSETS_DIR = path.join(__dirname, '../../../assets')
const FONT_REGULAR = path.join(ASSETS_DIR, 'fonts/Montserrat-Regular.ttf')
const FONT_BOLD = path.join(ASSETS_DIR, 'fonts/Montserrat-Bold.ttf')
const FONT_EXTRABOLD = path.join(ASSETS_DIR, 'fonts/Montserrat-ExtraBold.ttf')
const LOGO_WHITE = path.join(ASSETS_DIR, 'brand/platio-logo-white.png')

function registerFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont('Montserrat', FONT_REGULAR)
  doc.registerFont('Montserrat-Bold', FONT_BOLD)
  doc.registerFont('Montserrat-ExtraBold', FONT_EXTRABOLD)
}

type LabelRow = RiderDeliveryRow & { orderRef: string }

function drawHeader(doc: PDFKit.PDFDocument): void {
  const HEADER_HEIGHT = 16

  doc.rect(0, 0, LABEL_WIDTH, HEADER_HEIGHT).fill('#1A1A1A')
  doc.image(LOGO_WHITE, MARGIN, HEADER_HEIGHT / 2 - 6, { height: 12 })
  doc
    .fillColor('#FFFFFF')
    .font('Montserrat')
    .fontSize(6)
    .text('KITCHEN · FRESH DAILY LUNCH', MARGIN, HEADER_HEIGHT / 2 - 3, {
      width: CONTENT_WIDTH,
      align: 'right',
      characterSpacing: 0.5,
    })
}

export function composeBadgeText(input: {
  mealType: string
  mealName?: string | null
  displays?: MealTypeDisplay[]
  fits: (text: string, fontSize: number) => boolean
}): { text: string; fontSize: number } {
  const typeLabel = mealTypeShortEn(input.mealType, input.displays)
  const fallback = mealTypeNameEn(input.mealType, input.displays)
  let dish = (input.mealName ?? '').trim()
  if (dish.length > 22) dish = `${dish.slice(0, 21)}…`

  let fontSize = 7
  let text = dish ? `${typeLabel} · ${dish}` : fallback
  while (fontSize > 5 && !input.fits(text, fontSize)) fontSize -= 0.5

  while (dish.length > 0 && !input.fits(text, fontSize)) {
    dish = dish.slice(0, -1)
    text = dish ? `${typeLabel} · ${dish}…` : fallback
  }
  while (text.length > 1 && !input.fits(text, fontSize)) {
    text = `${text.slice(0, -2)}…`
  }
  return { text, fontSize }
}

function drawMealBadge(
  doc: PDFKit.PDFDocument,
  row: LabelRow,
  y: number,
  displays: MealTypeDisplay[]
): number {
  const badgeColor = row.mealType === 'executive' ? '#E4281D' : '#16A34A'
  const composed = composeBadgeText({
    mealType: row.mealType,
    mealName: row.mealName,
    displays,
    fits: (text, fontSize) => {
      doc.font('Montserrat-Bold').fontSize(fontSize)
      return doc.widthOfString(text) <= MEAL_BADGE_MAX_TEXT_PT
    },
  })
  const badgeText = composed.text
  const badgeFontSize = composed.fontSize
  const badgePaddingX = BADGE_PADDING_X
  const badgeHeight = 13

  doc.font('Montserrat-Bold').fontSize(badgeFontSize)
  const textWidth = doc.widthOfString(badgeText)
  const badgeWidth = textWidth + badgePaddingX * 2

  doc.roundedRect(MARGIN, y, badgeWidth, badgeHeight, 3).fill(badgeColor)
  doc
    .fillColor('#000000')
    .font('Montserrat-Bold')
    .fontSize(badgeFontSize)
    .text(
      badgeText,
      MARGIN + badgePaddingX,
      y + (badgeHeight - badgeFontSize) / 2 - 1
    )

  return badgeHeight
}

function drawLabel(
  doc: PDFKit.PDFDocument,
  row: LabelRow,
  date: string,
  displays: MealTypeDisplay[]
): void {
  drawHeader(doc)

  let y = 26
  doc
    .fillColor('#000000')
    .font('Montserrat-ExtraBold')
    .fontSize(13.6)
    .text(row.customerName, MARGIN, y, { width: CONTENT_WIDTH })

  y = 39
  if (row.customerPhone) {
    doc
      .fillColor('#444444')
      .font('Montserrat-Bold')
      .fontSize(8.5)
      .text(row.customerPhone, MARGIN, y, { width: CONTENT_WIDTH })
    y = 49
  } else {
    y = 41
  }

  doc
    .fillColor('#333333')
    .font('Montserrat')
    .fontSize(9)
    .text(row.buildingName || '—', MARGIN, y, { width: CONTENT_WIDTH })

  y += 11
  const addressLine = [row.floor, row.deskArea, row.gate]
    .filter(Boolean)
    .join(' · ')
  doc.fontSize(9).text(addressLine || '—', MARGIN, y, { width: CONTENT_WIDTH })

  // One blank line between last address line and delivery preference (font 9 ≈ 11pt line step).
  y = doc.y + 11
  doc
    .fillColor('#555555')
    .font('Montserrat')
    .fontSize(7.5)
    .text(
      row.deliveryPreference === 'reception'
        ? 'Leave at reception'
        : 'Hand to customer',
      MARGIN,
      y,
      {
        width: CONTENT_WIDTH,
      }
    )

  const badgeY = LABEL_HEIGHT - 40
  const badgeHeight = drawMealBadge(doc, row, badgeY, displays)

  doc
    .fillColor('#666666')
    .font('Montserrat')
    .fontSize(6.8)
    .text(`Delivery: ${date}`, MARGIN, badgeY + badgeHeight + 4)

  doc.text(row.orderRef, MARGIN, badgeY + badgeHeight + 4, {
    width: CONTENT_WIDTH,
    align: 'right',
  })
}

export function makeUC(deps: Deps) {
  return async function generateDeliveryLabelsPdf(
    input: GenerateDeliveryLabelsPdfInput
  ): Promise<GenerateDeliveryLabelsPdfOutput> {
    const { logger, deliveryDayLoader } = deps

    try {
      const displays = await loadMealTypeDisplays(deps.appSettingsLoader)
      const date = input.date ?? todayKSA()
      const mealType = input.mealType ?? 'all'

      const allRows = await deliveryDayLoader.getRiderDeliveriesByDate(
        date,
        input.areaId
      )
      const filteredRows =
        mealType === 'all'
          ? allRows
          : allRows.filter(r => r.mealType === mealType)
      const withRef: LabelRow[] = filteredRows.map((r, i) => ({
        ...r,
        orderRef: `#PL-${date}-${String(i + 1).padStart(4, '0')}`,
      }))

      let toRender = withRef
      if (input.labelId) {
        const match = withRef.find(r => r.deliveryDayId === input.labelId)
        if (!match) throw new ResourceNotFoundError('Label', input.labelId)
        toRender = [match]
      }

      const { default: PDFDocument } = await import('pdfkit')
      const doc = new PDFDocument({
        size: [LABEL_WIDTH, LABEL_HEIGHT],
        margin: 0,
      })
      registerFonts(doc)
      const chunks: Buffer[] = []
      doc.on('data', chunk => chunks.push(chunk as Buffer))
      const finished = new Promise<Buffer>((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
      })

      if (toRender.length === 0) {
        doc
          .font('Montserrat')
          .fontSize(10)
          .text('No deliveries match this filter.', MARGIN, MARGIN)
      } else {
        toRender.forEach((row, index) => {
          if (index > 0)
            doc.addPage({ size: [LABEL_WIDTH, LABEL_HEIGHT], margin: 0 })
          drawLabel(doc, row, date, displays)
        })
      }
      doc.end()

      const buffer = await finished
      const filename = input.labelId
        ? `platio-label-${input.labelId}.pdf`
        : `platio-labels-${date}-${mealType}.pdf`

      return { buffer, filename }
    } catch (error) {
      logger.error(
        'GenerateDeliveryLabelsPdf failed',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'GenerateDeliveryLabelsPdf'
