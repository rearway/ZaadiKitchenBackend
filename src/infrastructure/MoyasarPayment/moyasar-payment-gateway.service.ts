import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PaymentGateway, ChargeInput, ChargeResult, FetchPaymentResult } from '../../core/entitygateway/PaymentGateway.js'
import { LoggerService } from '../Logger/index.js'

@Injectable()
export class MoyasarPaymentGatewayService implements PaymentGateway {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {}

  async charge(input: ChargeInput): Promise<ChargeResult> {
    try {
      const apiKey = this.configService.get<string>('MOYASAR_API_KEY')
      
      if (!apiKey) {
        throw new Error('MOYASAR_API_KEY is not configured')
      }

      // Convert SAR to Halalas (Moyasar uses minor units)
      const amount = Math.round(input.amountSar * 100)
      
      // Basic Auth: API_KEY: (empty password)
      const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`

      const response = await fetch('https://api.moyasar.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount,
          currency: 'SAR',
          description: input.description,
          source: {
            type: 'token',
            token: input.paymentToken
          },
          metadata: {
            orderId: input.orderId
          }
        })
      })

      const data = (await response.json()) as any

      if (!response.ok) {
        this.logger.error('Moyasar Payment Error Response', JSON.stringify(data))
        return {
          success: false,
          gatewayPaymentId: '',
          errorMessage: data.message || 'Payment could not be processed with Moyasar'
        }
      }

      // Accepted statuses for a successful charge
      if (data.status === 'paid' || data.status === 'captured' || data.status === 'authorized') {
        return {
          success: true,
          gatewayPaymentId: data.id
        }
      } else {
        return {
          success: false,
          gatewayPaymentId: data.id || '',
          errorMessage: data.source?.message || `Payment failed with status: ${data.status}`
        }
      }
    } catch (error) {
      this.logger.error('Moyasar Payment Exception', String(error))
      return {
        success: false,
        gatewayPaymentId: '',
        errorMessage: 'An unexpected error occurred during payment processing.'
      }
    }
  }

  async fetchPayment(gatewayPaymentId: string): Promise<FetchPaymentResult> {
    try {
      const apiKey = this.configService.get<string>('MOYASAR_API_KEY')
      if (!apiKey) {
        throw new Error('MOYASAR_API_KEY is not configured')
      }

      const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
      const response = await fetch(`https://api.moyasar.com/v1/payments/${gatewayPaymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      })

      const data = (await response.json()) as any

      if (!response.ok) {
        this.logger.error('Moyasar Fetch Payment Error', JSON.stringify(data))
        return { success: false, status: 'failed', gatewayPaymentId }
      }

      const isSuccess = data.status === 'paid' || data.status === 'captured' || data.status === 'authorized'
      
      return {
        success: isSuccess,
        status: data.status,
        gatewayPaymentId: data.id,
      }
    } catch (error) {
      this.logger.error('Moyasar Fetch Payment Exception', String(error))
      return { success: false, status: 'error', gatewayPaymentId }
    }
  }
}
