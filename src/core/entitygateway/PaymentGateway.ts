export interface ChargeInput {
  amountSar: number
  paymentToken: string
  /** Payment transaction id. Sent as Moyasar `given_id` and the Idempotency-Key header. */
  orderId: string
  description: string
  idempotencyKey: string
  metadata?: Record<string, string>
}

export interface ChargeResult {
  success: boolean
  gatewayPaymentId: string
  errorMessage?: string
  /**
   * Network, timeout, 5xx, or an unsettled status such as `authorized`.
   * The same idempotency key must be reused. Do not start a new charge.
   */
  ambiguous?: boolean
  status?: string
}

export interface FetchPaymentResult {
  success: boolean
  status: string
  gatewayPaymentId: string
  metadata?: Record<string, string>
}

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>
  fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult>
}
