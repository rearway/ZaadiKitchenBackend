import { computePricePerMealSar, toPlanDiscountFields } from '../planPricing.js'

describe('toPlanDiscountFields', () => {
  it('returns max price and discount percent when max price is higher', () => {
    expect(toPlanDiscountFields({ priceSar: 50, maxPriceSar: 100 })).toEqual({
      max_price_sar: 100,
      discount_percent: 50,
    })
  })

  it('rounds the discount percent to a whole number', () => {
    expect(toPlanDiscountFields({ priceSar: 500, maxPriceSar: 650 })).toEqual({
      max_price_sar: 650,
      discount_percent: 23,
    })
  })

  it('returns nulls when there is no max price', () => {
    expect(toPlanDiscountFields({ priceSar: 50, maxPriceSar: null })).toEqual({
      max_price_sar: null,
      discount_percent: null,
    })
  })

  it('returns nulls when max price equals the price', () => {
    expect(toPlanDiscountFields({ priceSar: 50, maxPriceSar: 50 })).toEqual({
      max_price_sar: null,
      discount_percent: null,
    })
  })
})

describe('computePricePerMealSar', () => {
  it('divides price by meal count rounded to 2 decimals', () => {
    expect(computePricePerMealSar(500, 22)).toBe(22.73)
    expect(computePricePerMealSar(125, 5)).toBe(25)
  })
})
