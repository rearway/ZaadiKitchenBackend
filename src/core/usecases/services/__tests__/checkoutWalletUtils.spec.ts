import { makeCheckoutSession } from '../../../../__tests__/helpers/mock-deps'
import {
  computeCheckoutWalletAndDue,
  needsGatewayCharge,
} from '../checkoutWalletUtils'

describe('checkoutWalletUtils', () => {
  it('needsGatewayCharge is false when wallet covers the plan', () => {
    expect(needsGatewayCharge(0)).toBe(false)
    expect(needsGatewayCharge(0.004)).toBe(false)
    expect(needsGatewayCharge(0.01)).toBe(true)
  })

  it('applies full wallet credit when balance exceeds plan price', () => {
    const session = makeCheckoutSession({
      basePriceSar: 28,
      walletCreditSar: 0,
      totalDueSar: 28,
      promoDiscountSar: 0,
    })
    const result = computeCheckoutWalletAndDue(session, 50)
    expect(result.walletCreditSar).toBe(28)
    expect(result.totalDueSar).toBe(0)
  })

  it('subtracts promo from amount due after wallet credit', () => {
    const session = makeCheckoutSession({
      basePriceSar: 100,
      promoDiscountSar: 20,
      walletCreditSar: 0,
      totalDueSar: 100,
    })
    const result = computeCheckoutWalletAndDue(session, 50)
    expect(result.walletCreditSar).toBe(50)
    expect(result.totalDueSar).toBe(30)
  })
})
