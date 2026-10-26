import { dedupeDevicesForPush } from '../pushRecipients'
import type { UserDevice } from '../../../entities/UserDevice'

function device(
  id: string,
  deviceToken: string,
  endpointArn: string,
  updatedAt: string
): UserDevice {
  return {
    id,
    userId: 'user-1',
    platform: 'android',
    deviceToken,
    endpointArn,
    subscriptionArn: 'arn:sub',
    isActive: true,
    createdAt: new Date(updatedAt),
    updatedAt: new Date(updatedAt),
  }
}

describe('dedupeDevicesForPush', () => {
  it('keeps the newest row for a repeated token or endpoint', () => {
    const recipients = dedupeDevicesForPush([
      device('old-token', 'token-a', 'arn-old', '2026-09-01'),
      device('new-token', 'token-a', 'arn-new', '2026-10-02'),
      device('same-endpoint', 'token-b', 'arn-new', '2026-10-01'),
      device('other-phone', 'token-c', 'arn-c', '2026-10-03'),
      device('blank', 'token-d', '  ', '2026-10-04'),
    ])

    expect(recipients.map(item => item.id)).toEqual([
      'other-phone',
      'new-token',
    ])
  })
})
