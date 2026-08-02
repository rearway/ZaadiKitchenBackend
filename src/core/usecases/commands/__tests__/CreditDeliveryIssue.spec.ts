import { makeUC } from '../CreditDeliveryIssue'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iss-1',
    userId: 'user-1',
    subscriptionId: 'sub-1',
    deliveryDate: '2026-08-02',
    issueType: 'quality_issue',
    description: 'Meal was cold on arrival.',
    status: 'open' as const,
    creditedAmountSar: undefined,
    rejectionReason: undefined,
    rejectionNotes: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('CreditDeliveryIssue', () => {
  it('credits the wallet, resolves the issue, and notifies the customer', async () => {
    const issue = makeIssue()
    const resolved = makeIssue({ status: 'credited', creditedAmountSar: 28, updatedAt: new Date('2026-08-02T14:10:00Z') })
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
    const creditDeliveryIssue = makeUC(deps)

    const result = await creditDeliveryIssue({
      issueId: 'iss-1',
      creditSar: 28,
      note: 'Meal quality did not meet our standards.',
      resolvedByUserId: 'admin-1',
    })

    expect(deps.walletPersistor.createTransaction).toHaveBeenCalledWith({
      userId: 'user-1',
      type: 'credit',
      amountSar: 28,
      label: 'Issue credit',
      description: 'Meal quality did not meet our standards.',
      referenceId: 'iss-1',
    })
    expect(deps.deliveryIssuePersistor.resolveIssue).toHaveBeenCalledWith('iss-1', 'credited', { creditedAmountSar: 28 })
    expect(deps.notificationGateway.notify).toHaveBeenCalledWith('user-1', expect.stringContaining('28'))
    expect(result).toMatchObject({ status: 'resolved', resolution: 'credit', credit_sar: 28, resolved_by: 'Mohammed Al-Qahtani' })
  })

  it('throws ISSUE_ALREADY_RESOLVED when the issue is not open', async () => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(makeIssue({ status: 'credited' })),
      },
    })
    const creditDeliveryIssue = makeUC(deps)

    await expect(
      creditDeliveryIssue({ issueId: 'iss-1', creditSar: 28, resolvedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'ISSUE_ALREADY_RESOLVED', statusCode: 409 })
    expect(deps.walletPersistor.createTransaction).not.toHaveBeenCalled()
  })

  it('throws RESOURCE_NOT_FOUND when the issue does not exist', async () => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(null),
      },
    })
    const creditDeliveryIssue = makeUC(deps)

    await expect(
      creditDeliveryIssue({ issueId: 'missing', creditSar: 28, resolvedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'RESOURCE_NOT_FOUND', statusCode: 404 })
  })

  it.each([0, -5, 501])('throws VALIDATION_ERROR for an out-of-range amount: %d', async amount => {
    const deps = buildDeps({
      deliveryIssueLoader: {
        ...buildDeps().deliveryIssueLoader,
        getIssueById: jest.fn().mockResolvedValue(makeIssue()),
      },
    })
    const creditDeliveryIssue = makeUC(deps)

    await expect(
      creditDeliveryIssue({ issueId: 'iss-1', creditSar: amount, resolvedByUserId: 'admin-1' })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })
    expect(deps.walletPersistor.createTransaction).not.toHaveBeenCalled()
  })
})
