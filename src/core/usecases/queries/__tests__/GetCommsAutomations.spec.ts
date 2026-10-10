import { makeUC } from '../GetCommsAutomations'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps'

describe('GetCommsAutomations', () => {
  it('returns automation list with snake_case envelope', async () => {
    const deps = buildDeps({
      commsLoader: {
        ...buildDeps().commsLoader,
        getAutomationStates: jest.fn().mockResolvedValue([
          { id: 'delivery_confirmed', isEnabled: true, updatedAt: null, updatedByUserId: null },
          { id: 'lapsed_reactivation', isEnabled: false, updatedAt: null, updatedByUserId: null },
        ]),
      },
    })
    const getCommsAutomations = makeUC(deps)

    const result = await getCommsAutomations()

    expect(result.data.automations).toHaveLength(5)
    expect(result.data.automations[0]).toMatchObject({
      id: 'delivery_confirmed',
      name: 'Delivery Confirmed',
      is_enabled: true,
      channel: 'push',
    })
    expect(result.data.automations.find(a => a.id === 'lapsed_reactivation')?.is_enabled).toBe(false)
  })
})
