import { makeUC } from '../GetPaymentMethods.js'
import {
  buildDeps,
  makePaymentMethod,
} from '../../../../__tests__/helpers/mock-deps.js'

describe('GetPaymentMethods', () => {
  it('returns an empty list when the user has no saved cards', async () => {
    const deps = buildDeps()
    const result = await makeUC(deps)({ userId: 'user-uuid-1' })
    expect(result).toEqual({ payment_methods: [] })
    expect(deps.paymentMethodLoader.getMethodsByUserId).toHaveBeenCalledWith(
      'user-uuid-1'
    )
  })

  it('returns saved cards and does not invent the hardcoded method ids', async () => {
    const saved = makePaymentMethod({
      id: 'pm-real-1',
      type: 'visa',
      label: 'Visa ····0000',
      token: '{"last_four":"4242"}',
      isDefault: true,
      isLastUsed: false,
    })
    const deps = buildDeps({
      paymentMethodLoader: {
        ...buildDeps().paymentMethodLoader,
        getMethodsByUserId: jest.fn().mockResolvedValue([saved]),
      },
    })

    const result = await makeUC(deps)({ userId: 'user-uuid-1' })

    expect(result.payment_methods).toEqual([
      {
        id: 'pm-real-1',
        type: 'visa',
        label: 'Visa ····4242',
        is_default: true,
        is_last_used: false,
      },
    ])
    expect(result.payment_methods.map(method => method.id)).not.toContain(
      '00000000-0000-0000-0000-000000000001'
    )
  })
})
