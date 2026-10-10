import { makeUC } from '../DeleteAccount'
import {
  buildDeps,
  makeUser,
} from '../../../../__tests__/helpers/mock-deps'

describe('DeleteAccount', () => {
  it('anonymizes customer account and revokes sessions', async () => {
    const user = makeUser({ role: 'CUSTOMER' })
    const deletedAt = new Date('2026-09-22T10:00:00.000Z')
    const deps = buildDeps({
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(user),
        getUserByPhone: jest.fn().mockResolvedValue(user),
        getUserByEmail: jest.fn().mockResolvedValue(user),
      },
      userPersistor: {
        ...buildDeps().userPersistor,
        anonymizeAccountForDeletion: jest.fn().mockResolvedValue({
          ...user,
          isActive: false,
          deletedAt,
        }),
      },
      subscriptionLoader: {
        ...buildDeps().subscriptionLoader,
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      },
    })
    const deleteAccount = makeUC(deps)

    const result = await deleteAccount({ userId: user.id, confirm: true })

    expect(result.message).toBe('Account deleted successfully')
    expect(result.data.deleted_at).toBe(deletedAt.toISOString())
    expect(deps.refreshTokenPersistor.revokeAllUserTokens).toHaveBeenCalledWith(user.id)
    expect(deps.userDevicePersistor.deactivateAllDevicesForUser).toHaveBeenCalledWith(
      user.id
    )
    expect(deps.userPersistor.anonymizeAccountForDeletion).toHaveBeenCalledWith(user.id)
  })

  it('cancels active subscription before deletion', async () => {
    const user = makeUser({ role: 'CUSTOMER' })
    const sub = {
      id: 'sub-1',
      userId: user.id,
      status: 'active',
      endDate: '2026-10-01',
    }
    const deps = buildDeps({
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(user),
        getUserByPhone: jest.fn().mockResolvedValue(user),
        getUserByEmail: jest.fn().mockResolvedValue(user),
      },
      userPersistor: {
        ...buildDeps().userPersistor,
        anonymizeAccountForDeletion: jest.fn().mockResolvedValue({
          ...user,
          deletedAt: new Date(),
        }),
      },
      subscriptionLoader: {
        getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(sub),
        getSubscriptionById: jest.fn().mockResolvedValue(sub),
      },
    })
    const deleteAccount = makeUC(deps)

    const result = await deleteAccount({ userId: user.id, confirm: true })

    expect(result.data.subscription_cancelled).toBe(true)
    expect(deps.subscriptionPersistor.updateSubscription).toHaveBeenCalledWith('sub-1', {
      status: 'cancelled',
    })
  })

  it('rejects admin accounts', async () => {
    const deps = buildDeps({
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(makeUser({ role: 'ADMIN' })),
        getUserByPhone: jest.fn().mockResolvedValue(null),
        getUserByEmail: jest.fn().mockResolvedValue(null),
      },
    })
    const deleteAccount = makeUC(deps)

    await expect(deleteAccount({ userId: 'u1', confirm: true })).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
    })
  })

  it('requires confirm true', async () => {
    const deps = buildDeps()
    const deleteAccount = makeUC(deps)

    await expect(
      deleteAccount({ userId: 'u1', confirm: false as unknown as true })
    ).rejects.toMatchObject({ errorCode: 'VALIDATION_ERROR' })
  })
})
