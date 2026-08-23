import { MoyasarPaymentGatewayService } from '../moyasar-payment-gateway.service.js'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '../../Logger/index.js'

describe('MoyasarPaymentGatewayService', () => {
  let service: MoyasarPaymentGatewayService
  let mockConfigService: jest.Mocked<ConfigService>
  let mockLoggerService: jest.Mocked<LoggerService>

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MOYASAR_API_KEY') return 'sk_test_123'
        return null
      }),
    } as any

    mockLoggerService = {
      error: jest.fn(),
      log: jest.fn(),
    } as any

    service = new MoyasarPaymentGatewayService(mockConfigService, mockLoggerService)
    
    // Mock global fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should return success when payment is paid', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'paid', id: 'pay_123' }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: 'ord_123',
      description: 'Test Order'
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
    expect(result.gatewayPaymentId).toBe('pay_123')
  })

  it('should return success when payment is authorized', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'authorized', id: 'pay_124' }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: 'ord_123',
      description: 'Test Order'
    })

    expect(result.success).toBe(true)
    expect(result.gatewayPaymentId).toBe('pay_124')
  })

  it('should return failure when payment status is failed', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'failed', id: 'pay_999', source: { message: 'Insufficient funds' } }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: 'ord_123',
      description: 'Test Order'
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Insufficient funds')
  })

  it('should handle non-ok http responses (e.g. 400 bad request)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ type: 'invalid_request_error', message: 'Invalid token' }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_invalid',
      orderId: 'ord_123',
      description: 'Test Order'
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Invalid token')
    expect(mockLoggerService.error).toHaveBeenCalled()
  })

  it('should handle network exceptions', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network disconnected'))

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: 'ord_123',
      description: 'Test Order'
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('An unexpected error occurred during payment processing.')
    expect(mockLoggerService.error).toHaveBeenCalledWith('Moyasar Payment Exception', 'Error: Network disconnected')
  })
})
