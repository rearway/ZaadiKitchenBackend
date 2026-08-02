import { makeUC } from '../ReportRiderIssue'
import { buildDeps, makeDeliveryDay } from '../../../../__tests__/helpers/mock-deps'

describe('ReportRiderIssue', () => {
  it('creates a rider issue for an existing delivery', async () => {
    const day = makeDeliveryDay({ id: 'dd-uuid-1' })
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayById: jest.fn().mockResolvedValue(day),
      },
    })
    const reportRiderIssue = makeUC(deps)

    const result = await reportRiderIssue({
      deliveryId: 'dd-uuid-1',
      riderId: 'rider-uuid-1',
      issueType: 'customer_not_found',
      notes: 'Called twice, no answer.',
    })

    expect(deps.riderIssuePersistor.createRiderIssue).toHaveBeenCalledWith({
      deliveryDayId: 'dd-uuid-1',
      riderId: 'rider-uuid-1',
      issueType: 'customer_not_found',
      notes: 'Called twice, no answer.',
    })
    expect(result.data.delivery_id).toBe('dd-uuid-1')
  })

  it('throws VALIDATION_ERROR for an unsupported issue type', async () => {
    const deps = buildDeps()
    const reportRiderIssue = makeUC(deps)

    await expect(
      reportRiderIssue({
        deliveryId: 'dd-uuid-1',
        riderId: 'rider-uuid-1',
        issueType: 'bogus' as never,
      })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })
    expect(deps.riderIssuePersistor.createRiderIssue).not.toHaveBeenCalled()
  })

  it('throws DELIVERY_NOT_FOUND when the delivery does not exist', async () => {
    const deps = buildDeps({
      deliveryDayLoader: {
        ...buildDeps().deliveryDayLoader,
        getDeliveryDayById: jest.fn().mockResolvedValue(null),
      },
    })
    const reportRiderIssue = makeUC(deps)

    await expect(
      reportRiderIssue({
        deliveryId: 'missing-id',
        riderId: 'rider-uuid-1',
        issueType: 'other',
      })
    ).rejects.toMatchObject({ errorCode: 'DELIVERY_NOT_FOUND', statusCode: 404 })
    expect(deps.riderIssuePersistor.createRiderIssue).not.toHaveBeenCalled()
  })
})
