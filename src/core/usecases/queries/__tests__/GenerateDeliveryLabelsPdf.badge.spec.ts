import path from 'node:path'
import PDFDocument from 'pdfkit'

import {
  composeBadgeText,
  MEAL_BADGE_MAX_TEXT_PT,
} from '../GenerateDeliveryLabelsPdf'

describe('delivery label badge width', () => {
  it('keeps Platio Balanced and a long dish inside the 100mm label', async () => {
    const doc = new PDFDocument({ size: [200, 100], margin: 0 })
    doc.registerFont(
      'Montserrat-Bold',
      path.join(__dirname, '../../../../assets/fonts/Montserrat-Bold.ttf')
    )
    doc.font('Montserrat-Bold')
    const fits = (text: string, fontSize: number) => {
      doc.font('Montserrat-Bold').fontSize(fontSize)
      return doc.widthOfString(text) <= MEAL_BADGE_MAX_TEXT_PT
    }

    const longDish = composeBadgeText({
      mealType: 'executive',
      mealName: 'Grilled Chicken Biryani With Extra Sauce And Rice',
      fits,
    })
    doc.fontSize(longDish.fontSize)
    expect(doc.widthOfString(longDish.text)).toBeLessThanOrEqual(MEAL_BADGE_MAX_TEXT_PT)
    expect(longDish.text.startsWith('Balanced')).toBe(true)

    const fallback = composeBadgeText({
      mealType: 'salad',
      mealName: null,
      fits,
    })
    expect(fallback.text).toBe('Platio Light')
    doc.fontSize(fallback.fontSize)
    expect(doc.widthOfString(fallback.text)).toBeLessThanOrEqual(MEAL_BADGE_MAX_TEXT_PT)

    doc.end()
  })
})
