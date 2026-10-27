import {
  buildPaymentMethodLabel,
  extractCardLast4,
} from '../payment-method-label.js'
import { walletCoversDebit } from '../payment-status.js'

describe('buildPaymentMethodLabel', () => {
  it('uses last4 from a token or source payload', () => {
    expect(extractCardLast4('{"last_four":"4242"}')).toBe('4242')
    expect(extractCardLast4('XXXX-XXXX-XXXX-1111')).toBe('1111')
    expect(extractCardLast4('tok_sandbox_abc|1881')).toBe('1881')
    expect(
      buildPaymentMethodLabel(
        'visa',
        '{"source":{"number":"XXXX-XXXX-XXXX-4242"}}'
      )
    ).toBe('Visa ····4242')
    expect(buildPaymentMethodLabel('mada', 'tok_without_last4')).toBe('Mada')
    expect(buildPaymentMethodLabel('apple_pay', '{"last4":"4242"}')).toBe(
      'Apple Pay'
    )
    expect(buildPaymentMethodLabel('stc_pay', 'tok')).toBe('STC Pay')
  })
})

describe('walletCoversDebit', () => {
  it('compares halalas so a session credit cannot overdraw', () => {
    expect(walletCoversDebit(50, 50)).toBe(true)
    expect(walletCoversDebit(49.99, 50)).toBe(false)
    expect(walletCoversDebit(0, 0)).toBe(true)
  })
})
