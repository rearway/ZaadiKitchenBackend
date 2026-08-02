import { makeUC } from '../RejectDeliveryIssue'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iss-1',
    userId: 'user-1',
    subscriptionId: 'sub-1',
    deliveryDate: '2026-08-02',
    issueType: 'wrong_order',
    description: 'Wrong meal delivered.',
    status: 'open' as const,
    creditedAmountSar: undefined,
    rejectionReason: undefined,
    rejectionNotes: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('RejectDeliveryIssue', () => {
  it('resolves the issue as rejected and notifies the customer with the reason', async () => {
    const issue = makeIssue()
    const resolved = makeIssue({ status: 'rejected', rejectionReason: 'Unable to verify.', updatedAt: new Date('2026-08-02T14:15:00Z') })
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(issue),
      },
      deliveryIssuePersistor: {
        ...buildDeps().deliveryIssuePersistor,
        resolveIssue: jest.fn().mockResolvedValue(resolved),
      },
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: 'admin-1', fullName: 'Mohammed Al-Qahtani' })),
      },
    })
    const rejectDeliveryIssue = makeUC(deps)

    const result = await rejectDeliveryIssue({
      issueId: 'iss-1',
      reason: 'Unable to verify.',
      note: 'Kitchen confirmed correct order.',
      resolvedByUserId: 'admin-1',
    })

    expect(deps.deliveryIssuePersistor.resolveIssue).toHaveBeenCalledWith('iss-1', 'rejected', {
      rejectionReason: 'Unable to verify.',
      rejectionNotes: 'Kitchen confirmed correct order.',
    })
    expect(deps.notificationGateway.notify).toHaveBeenCalledWith('user-1', 'Unable to verify.')
    expect(result).toMatchObject({ status: 'resolved', resolution: 'rejected', resolved_by: 'Mohammed Al-Qahtani' })
  })

  it('throws ISSUE_ALREADY_RESOLVED when the issue is not open', async () => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(makeIssue({ status: 'rejected' })),
      },
    })
    const rejectDeliveryIssue = makeUC(deps)

    await expect(
      rejectDeliveryIssue({ issueId: 'iss-1', reason: 'Unable to verify.', resolvedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'ISSUE_ALREADY_RESOLVED', statusCode: 409 })
    expect(deps.deliveryIssuePersistor.resolveIssue).not.toHaveBeenCalled()
  })

  it('throws RESOURCE_NOT_FOUND when the issue does not exist', async () => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(null),
      },
    })
    const rejectDeliveryIssue = makeUC(deps)

    await expect(
      rejectDeliveryIssue({ issueId: 'missing', reason: 'Unable to verify.', resolvedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'RESOURCE_NOT_FOUND', statusCode: 404 })
  })
})
