import { makeUC } from '../RegisterDevice.js'
import { Deps } from '../../../entitygateway/index.js'
import { UserDevice } from '../../../entities/UserDevice.js'

describe('RegisterDevice Use Case', () => {
  let deps: Partial<Deps>
  let mockNotificationGateway: any
  let mockUserDevicePersistor: any
  let mockLogger: any
  
  beforeEach(() => {
    mockNotificationGateway = {
      createPlatformEndpoint: jest.fn().mockResolvedValue('arn:endpoint'),
      subscribeToTopic: jest.fn().mockResolvedValue('arn:subscription'),
    }

    mockUserDevicePersistor = {
      upsertDevice: jest.fn().mockImplementation((userId, platform, deviceToken, endpointArn, subscriptionArn) => {
        return Promise.resolve({
          id: 'test-id',
          userId,
          platform,
          deviceToken,
          endpointArn,
          subscriptionArn,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as UserDevice)
      }),
    }

    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
    }

    deps = {
      notificationGateway: mockNotificationGateway,
      userDevicePersistor: mockUserDevicePersistor,
      logger: mockLogger,
    }
  })

  it('should create an endpoint, subscribe to topic, and upsert device', async () => {
    const uc = makeUC(deps as Deps)
    
    const result = await uc({
      userId: 'user-1',
      platform: 'ios',
      deviceToken: 'token123'
    })

    expect(mockNotificationGateway.createPlatformEndpoint).toHaveBeenCalledWith('ios', 'token123', 'user-1')
    expect(mockNotificationGateway.subscribeToTopic).toHaveBeenCalledWith('arn:endpoint', 'broadcast')
    expect(mockUserDevicePersistor.upsertDevice).toHaveBeenCalledWith('user-1', 'ios', 'token123', 'arn:endpoint', 'arn:subscription')
    
    expect(result.message).toBe('Device registered successfully')
    expect(result.data.userId).toBe('user-1')
    expect(result.data.endpointArn).toBe('arn:endpoint')
  })

  it('should throw and log error if creation fails', async () => {
    mockNotificationGateway.createPlatformEndpoint.mockRejectedValue(new Error('SNS Error'))
    const uc = makeUC(deps as Deps)
    
    await expect(uc({
      userId: 'user-1',
      platform: 'ios',
      deviceToken: 'token123'
    })).rejects.toThrow('SNS Error')

    expect(mockLogger.error).toHaveBeenCalled()
  })
})
