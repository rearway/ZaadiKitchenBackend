import { makeUC } from '../AdminCreditWallet'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps'

function device(
  id: string,
  endpointArn: string,
  deviceToken: string,
  updatedAt: string
) {
  return { id, endpointArn, deviceToken, updatedAt: new Date(updatedAt) }
}

describe('AdminCreditWallet', () => {
  it('credits the wallet and sends one push per physical device', async () => {
    const deps = buildDeps({
      userLoader: {
        ...buildDeps().userLoader,
        getUserById: jest.fn().mockResolvedValue(makeUser({ id: 'user-1' })),
      },
      walletLoader: {
        ...buildDeps().walletLoader,
        getBalanceByUserId: jest.fn().mockResolvedValue(54),
      },
      userDeviceLoader: {
        ...buildDeps().userDeviceLoader,
        getDevicesByUserId: jest
          .fn()
          .mockResolvedValue([
            device('dev-1', 'arn:phone-a', 'token-a', '2026-10-02T00:00:00Z'),
            device(
              'dev-2',
              'arn:phone-a-old',
              'token-a',
              '2026-10-01T00:00:00Z'
            ),
            device('dev-3', 'arn:phone-b', 'token-b', '2026-10-02T00:00:00Z'),
          ]),
      },
    })

    const result = await makeUC(deps)({
      customerId: 'user-1',
      amountSar: 25,
      note: 'Goodwill',
    })

    const notificationGateway = deps.notificationGateway as {
      sendSingleNotification: jest.Mock
    }
    const walletPersistor = deps.walletPersistor as {
      createTransaction: jest.Mock
    }
    expect(walletPersistor.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'credit',
        amountSar: 25,
        label: 'Admin Credit',
      })
    )
    expect(notificationGateway.sendSingleNotification).toHaveBeenCalledTimes(2)
    expect(notificationGateway.sendSingleNotification).toHaveBeenCalledWith(
      'arn:phone-a',
      expect.any(String),
      expect.stringContaining('25'),
      { type: 'wallet_credited' }
    )
    expect(notificationGateway.sendSingleNotification).toHaveBeenCalledWith(
      'arn:phone-b',
      expect.any(String),
      expect.any(String),
      { type: 'wallet_credited' }
    )
    expect(result).toEqual({ message: 'Wallet credited successfully' })
  })
})
