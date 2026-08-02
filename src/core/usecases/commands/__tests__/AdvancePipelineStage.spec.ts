import { makeUC } from '../AdvancePipelineStage'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

const FAR_FUTURE_DATE = '2099-12-31' // 'pending'
const PAST_DATE = '2020-01-06' // 'locked' with no manual advance yet

describe('AdvancePipelineStage', () => {
  it('advances locked to dispatch and returns who advanced it', async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
      dailyOpsDayPersistor: {
        advanceStage: jest.fn().mockResolvedValue({
          date: PAST_DATE,
          dispatchedAt: new Date('2026-08-02T09:00:00Z'),
          dispatchedById: 'admin-1',
          deliveredAt: null,
          deliveredById: null,
        }),
      } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayPersistor'],
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: 'admin-1', fullName: 'Mohammed Al-Qahtani' })),
      },
    })
    const advancePipelineStage = makeUC(deps)

    const result = await advancePipelineStage({
      date: PAST_DATE,
      fromStage: 'locked',
      toStage: 'dispatch',
      advancedByUserId: 'admin-1',
    })

    expect(deps.dailyOpsDayPersistor.advanceStage).toHaveBeenCalledWith(PAST_DATE, 'dispatch', 'admin-1')
    expect(result).toMatchObject({
      previous_stage: 'locked',
      current_stage: 'dispatch',
      advanced_by: 'Mohammed Al-Qahtani',
    })
  })

  it('throws STAGE_MISMATCH when from_stage does not match the actual stage', async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
    })
    const advancePipelineStage = makeUC(deps)

    await expect(
      advancePipelineStage({
        date: FAR_FUTURE_DATE, // actual stage is 'pending'
        fromStage: 'locked',
        toStage: 'dispatch',
        advancedByUserId: 'admin-1',
      })
    ).rejects.toMatchObject({ errorCode: 'STAGE_MISMATCH', statusCode: 409 })
    expect(deps.dailyOpsDayPersistor.advanceStage).not.toHaveBeenCalled()
  })

  it('rejects skipping a stage (locked straight to delivered)', async () => {
    const deps = buildDeps({
      dailyOpsDayLoader: { getByDate: jest.fn().mockResolvedValue(null) } as unknown as ReturnType<typeof buildDeps>['dailyOpsDayLoader'],
    })
    const advancePipelineStage = makeUC(deps)

    await expect(
      advancePipelineStage({
        date: PAST_DATE, // actual stage is 'locked'
        fromStage: 'locked',
        toStage: 'delivered',
        advancedByUserId: 'admin-1',
      })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR', statusCode: 400 })
    expect(deps.dailyOpsDayPersistor.advanceStage).not.toHaveBeenCalled()
  })
})
