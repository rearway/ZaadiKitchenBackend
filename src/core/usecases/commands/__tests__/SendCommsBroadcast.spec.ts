import { makeUC } from '../SendCommsBroadcast'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'
import { ValidationError } from '../../../../shared/errors/domain.errors.js'

describe('SendCommsBroadcast', () => {
  it('sends push notifications to segment devices and records broadcast', async () => {
    const sendSingleNotification = jest.fn().mockResolvedValue(undefined)
    const createBroadcastRecord = jest.fn().mockResolvedValue({
      id: 'bc-uuid-1',
      segmentId: 'active',
      message: 'Hello team',
      recipientCount: 2,
      sentByUserId: 'admin-uuid-1',
      status: 'sent',
      sentAt: new Date('2026-09-17T12:00:00Z'),
    })
    const deps = buildDeps({
      commsLoader: {
        ...buildDeps().commsLoader,
        getSegmentRecipientUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
        getActiveDeviceEndpointsForUsers: jest
          .fn()
          .mockResolvedValue(['arn:endpoint:1', 'arn:endpoint:2']),
      },
      commsPersistor: {
        ...buildDeps().commsPersistor,
        createBroadcastRecord,
      },
      notificationGateway: {
        ...buildDeps().notificationGateway,
        sendSingleNotification,
      },
    })
    const sendCommsBroadcast = makeUC(deps)

    const result = await sendCommsBroadcast({
      segmentId: 'active',
      message: 'Hello team',
      adminUserId: 'admin-uuid-1',
    })

    expect(sendSingleNotification).toHaveBeenCalledTimes(2)
    expect(createBroadcastRecord).toHaveBeenCalled()
    expect(result.data).toMatchObject({
      broadcast_id: 'bc-uuid-1',
      segment_id: 'active',
      recipient_count: 2,
      status: 'sent',
    })
  })

  it('rejects empty segments', async () => {
    const deps = buildDeps({
      commsLoader: {
        ...buildDeps().commsLoader,
        getSegmentRecipientUserIds: jest.fn().mockResolvedValue([]),
      },
    })
    const sendCommsBroadcast = makeUC(deps)

    await expect(
      sendCommsBroadcast({
        segmentId: 'paused',
        message: 'No one here',
        adminUserId: 'admin-uuid-1',
      })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
