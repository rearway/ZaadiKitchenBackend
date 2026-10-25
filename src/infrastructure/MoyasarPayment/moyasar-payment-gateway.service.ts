import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  PaymentGateway,
  ChargeInput,
  ChargeResult,
  FetchPaymentResult,
} from '../../core/entitygateway/PaymentGateway.js'
import { isSettledPaymentStatus } from '../../core/constants/payment-status.js'
import { LoggerService } from '../Logger/index.js'

const MOYASAR_PAYMENTS_URL = 'https://api.moyasar.com/v1/payments'
const CHARGE_TIMEOUT_MS = 20_000
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function scalarString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return fallback
}

function metadataRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object') return undefined
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (raw == null || typeof raw === 'object') continue
    out[key] = scalarString(raw)
  }
  return out
}

/**
 * Moyasar dedupes payment creation with `given_id` (the payment id becomes that UUID).
 * The same value is also sent as `Idempotency-Key`. Retries of a timeout must reuse it
 * and call fetchPayment before creating a different charge.
 * `authorized` is not a successful charge — only `paid` and `captured` settle.
 */
@Injectable()
export class MoyasarPaymentGatewayService implements PaymentGateway {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    try {
      const apiKey = this.requireApiKey()
      return await this.createOrRecover(input, apiKey, true)
    } catch (error) {
      this.logger.error('Moyasar Payment Exception', String(error))
      return {
        success: false,
        gatewayPaymentId: input.idempotencyKey,
        ambiguous: true,
        errorMessage: 'An unexpected error occurred during payment processing.',
      }
    }
  }

  async fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult> {
    try {
      const apiKey = this.requireApiKey()
      const response = await fetch(
        `${MOYASAR_PAYMENTS_URL}/${gatewayPaymentId}`,
        {
          method: 'GET',
          headers: { Authorization: this.authHeader(apiKey) },
          signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
        }
      )

      if (response.status === 404) {
        return { success: false, status: 'not_found', gatewayPaymentId }
      }

      const data = await this.readJson(response)
      if (!response.ok || !data) {
        this.logger.error(
          'Moyasar Fetch Payment Error',
          JSON.stringify(data ?? { status: response.status })
        )
        return { success: false, status: 'error', gatewayPaymentId }
      }

      const status = scalarString(data.status, 'unknown')
      return {
        success: isSettledPaymentStatus(status),
        status,
        gatewayPaymentId: scalarString(data.id, gatewayPaymentId),
        metadata: metadataRecord(data.metadata),
      }
    } catch (error) {
      this.logger.error('Moyasar Fetch Payment Exception', String(error))
      return { success: false, status: 'error', gatewayPaymentId }
    }
  }

  private async createOrRecover(
    input: ChargeInput,
    apiKey: string,
    allowRetry: boolean
  ): Promise<ChargeResult> {
    let response: Response
    try {
      response = await this.postPayment(input, apiKey)
    } catch (error) {
      this.logger.error('Moyasar Payment Exception', String(error))
      return this.recover(input, apiKey, allowRetry)
    }

    if (response.status >= 500) {
      this.logger.error(
        'Moyasar Payment Error Response',
        String(response.status)
      )
      return this.recover(input, apiKey, allowRetry)
    }

    const data = await this.readJson(response)
    if (!response.ok) {
      const message =
        (data && typeof data.message === 'string' && data.message) ||
        'Payment could not be processed with Moyasar'
      if (response.status === 400 && /already created/i.test(message)) {
        return this.recover(input, apiKey, false)
      }
      this.logger.error('Moyasar Payment Error Response', JSON.stringify(data))
      return {
        success: false,
        gatewayPaymentId: data?.id ? scalarString(data.id) : '',
        errorMessage: message,
        status: data?.status ? scalarString(data.status) : undefined,
      }
    }

    if (!data) return this.recover(input, apiKey, allowRetry)
    return this.interpretPayment(data, input.idempotencyKey)
  }

  private async recover(
    input: ChargeInput,
    apiKey: string,
    allowRetry: boolean
  ): Promise<ChargeResult> {
    const fetched = await this.fetchPayment(input.idempotencyKey)
    if (isSettledPaymentStatus(fetched.status)) {
      return {
        success: true,
        gatewayPaymentId: fetched.gatewayPaymentId,
        status: fetched.status,
      }
    }
    if (
      fetched.status === 'failed' ||
      fetched.status === 'voided' ||
      fetched.status === 'refunded'
    ) {
      return {
        success: false,
        gatewayPaymentId: fetched.gatewayPaymentId,
        status: fetched.status,
        errorMessage: `Payment failed with status: ${fetched.status}`,
      }
    }
    if (
      fetched.status === 'authorized' ||
      fetched.status === 'initiated' ||
      fetched.status === 'verified'
    ) {
      return this.unsettled(fetched.gatewayPaymentId, fetched.status)
    }
    if (
      allowRetry &&
      (fetched.status === 'not_found' || fetched.status === 'error')
    ) {
      return this.createOrRecover(input, apiKey, false)
    }
    return {
      success: false,
      ambiguous: true,
      gatewayPaymentId: input.idempotencyKey,
      status: fetched.status,
      errorMessage:
        'Payment status could not be confirmed. Retry will reuse the same idempotency key.',
    }
  }

  private interpretPayment(
    data: Record<string, unknown>,
    idempotencyKey: string
  ): ChargeResult {
    const status = scalarString(data.status)
    const gatewayPaymentId = scalarString(data.id, idempotencyKey)
    if (isSettledPaymentStatus(status)) {
      return { success: true, gatewayPaymentId, status }
    }
    if (status === 'failed' || status === 'voided' || status === 'refunded') {
      const source = data.source as { message?: string } | undefined
      return {
        success: false,
        gatewayPaymentId,
        status,
        errorMessage:
          source?.message || `Payment failed with status: ${status}`,
      }
    }
    return this.unsettled(gatewayPaymentId, status)
  }

  private unsettled(gatewayPaymentId: string, status: string): ChargeResult {
    return {
      success: false,
      ambiguous: true,
      gatewayPaymentId,
      status,
      errorMessage:
        status === 'authorized'
          ? 'Payment is authorized but not captured.'
          : `Payment is not settled (status: ${status || 'unknown'}).`,
    }
  }

  private async postPayment(
    input: ChargeInput,
    apiKey: string
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: this.authHeader(apiKey),
    }
    if (input.idempotencyKey) {
      headers['Idempotency-Key'] = input.idempotencyKey
    }

    const body: Record<string, unknown> = {
      amount: Math.round(input.amountSar * 100),
      currency: 'SAR',
      description: input.description,
      source: { type: 'token', token: input.paymentToken },
      metadata: {
        ...(input.metadata ?? {}),
        orderId: input.orderId,
      },
    }
    if (input.idempotencyKey && UUID_RE.test(input.idempotencyKey)) {
      body.given_id = input.idempotencyKey
    }

    return fetch(MOYASAR_PAYMENTS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CHARGE_TIMEOUT_MS),
    })
  }

  private requireApiKey(): string {
    const apiKey = this.configService.get<string>('MOYASAR_API_KEY')
    if (!apiKey) throw new Error('MOYASAR_API_KEY is not configured')
    return apiKey
  }

  private authHeader(apiKey: string): string {
    return `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
  }

  private async readJson(
    response: Response
  ): Promise<Record<string, any> | null> {
    try {
      return (await response.json()) as Record<string, any>
    } catch {
      return null
    }
  }
}
