import { makeUC } from '../SendBulkBroadcast.js'
import { Deps } from '../../../entitygateway/index.js'

describe('SendBulkBroadcast Use Case', () => {
  let deps: Partial<Deps>
  let mockNotificationGateway: any
  let mockLogger: any
  
  beforeEach(() => {
    mockNotificationGateway = {
      publishToTopic: jest.fn().mockResolvedValue(undefined),
    }

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    }

    deps = {
      notificationGateway: mockNotificationGateway,
      logger: mockLogger,
    }
  })

  it('should call publishToTopic with the broadcast logical topic', async () => {
    const uc = makeUC(deps as Deps)
    
    const result = await uc({
      title: 'Hello',
      body: 'World'
    })

    expect(mockNotificationGateway.publishToTopic).toHaveBeenCalledWith('broadcast', 'Hello', 'World')
    expect(result.message).toBe('Broadcast sent successfully')
  })

  it('should throw and log error if publishing fails', async () => {
    mockNotificationGateway.publishToTopic.mockRejectedValue(new Error('Publish Failed'))
    const uc = makeUC(deps as Deps)
    
    await expect(uc({
      title: 'Hello',
      body: 'World'
    })).rejects.toThrow('Publish Failed')

    expect(mockLogger.error).toHaveBeenCalled()
  })
})
