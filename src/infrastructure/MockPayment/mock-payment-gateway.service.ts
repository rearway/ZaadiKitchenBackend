import { Injectable } from '@nestjs/common'
import crypto from 'crypto'
import type {
  PaymentGateway,
  ChargeInput,
  ChargeResult,
} from '../../core/entitygateway/PaymentGateway.js'

/**
 * Stands in for a real payment gateway (Moyasar, HyperPay, etc.).
 * Always returns success. Replace with MoyasarPaymentGatewayService
 * by swapping the binding in coreadapter.module.ts — no other code changes needed.
 */
@Injectable()
export class MockPaymentGatewayService implements PaymentGateway {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    return {
      success: true,
      gatewayPaymentId: `mock_pay_${crypto.randomUUID()}`,
    }
  }
}
