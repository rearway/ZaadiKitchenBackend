export interface ChargeInput {
  amountSar: number
  paymentToken: string
  orderId: string
  description: string
}

export interface ChargeResult {
  success: boolean
  gatewayPaymentId: string
  errorMessage?: string
}

export interface PaymentGateway {
  charge(input: ChargeInput): Promise<ChargeResult>
}
