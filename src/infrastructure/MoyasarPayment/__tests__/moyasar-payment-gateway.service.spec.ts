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

    service = new MoyasarPaymentGatewayService(
      mockConfigService,
      mockLoggerService
    )

    // Mock global fetch
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  const idempotencyKey = 'a1168bd1-47a4-4b97-8a50-dd5caaccacf2'

  it('should return success when payment is paid', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ status: 'paid', id: idempotencyKey }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [, request] = (global.fetch as jest.Mock).mock.calls[0]
    expect(request.headers['Idempotency-Key']).toBe(idempotencyKey)
    expect(JSON.parse(request.body).given_id).toBe(idempotencyKey)
    expect(result.success).toBe(true)
    expect(result.gatewayPaymentId).toBe(idempotencyKey)
  })

  it('does not treat authorized as a successful charge', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ status: 'authorized', id: 'pay_124' }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(result.success).toBe(false)
    expect(result.ambiguous).toBe(true)
    expect(result.status).toBe('authorized')
    expect(result.gatewayPaymentId).toBe('pay_124')
  })

  it('fetches the payment after a network error before retrying the charge', async () => {
    ;(global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('socket hang up'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'paid', id: idempotencyKey }),
      })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(result.success).toBe(true)
    expect(result.gatewayPaymentId).toBe(idempotencyKey)
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
      idempotencyKey
    )
  })

  it('should return failure when payment status is failed', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'failed',
        id: 'pay_999',
        source: { message: 'Insufficient funds' },
      }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(result.success).toBe(false)
    expect(result.ambiguous).toBeFalsy()
    expect(result.errorMessage).toBe('Insufficient funds')
  })

  it('should handle non-ok http responses (e.g. 400 bad request)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        type: 'invalid_request_error',
        message: 'Invalid token',
      }),
    })

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_invalid',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Invalid token')
    expect(mockLoggerService.error).toHaveBeenCalled()
  })

  it('returns an ambiguous result when the charge and status lookup both fail', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(
      new Error('Network disconnected')
    )

    const result = await service.charge({
      amountSar: 150,
      paymentToken: 'tok_abc',
      orderId: idempotencyKey,
      idempotencyKey,
      description: 'Test Order',
    })

    expect(result.success).toBe(false)
    expect(result.ambiguous).toBe(true)
    expect(result.gatewayPaymentId).toBe(idempotencyKey)
    expect(mockLoggerService.error).toHaveBeenCalled()
  })
})
