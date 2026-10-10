import { makeUC } from '../UpdateProfile.js'
import { buildDeps, makeUser } from '../../../../__tests__/helpers/mock-deps.js'

describe('UpdateProfile', () => {
  const userId = 'user-1'

  it('returns ValidationError when email belongs to another user', async () => {
    const deps = buildDeps({
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(null),
        getUserByPhone: jest.fn().mockResolvedValue(null),
        getUserByEmail: jest
          .fn()
          .mockResolvedValue(makeUser({ id: 'other-user', email: 'taken@example.com' })),
      },
      userPersistor: {
        createUser: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        anonymizeAccountForDeletion: jest.fn(),
      },
    })
    const updateProfile = makeUC(deps)

    await expect(
      updateProfile({
        userId,
        fullName: 'Test User',
        email: 'taken@example.com',
      })
    ).rejects.toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      statusCode: 400,
      message: 'This email is already registered',
    })

    expect(deps.userPersistor.updateUser).not.toHaveBeenCalled()
  })

  it('allows updating profile when email is already on the same user', async () => {
    const deps = buildDeps({
      userLoader: {
        getUserById: jest.fn().mockResolvedValue(null),
        getUserByPhone: jest.fn().mockResolvedValue(null),
        getUserByEmail: jest
          .fn()
          .mockResolvedValue(makeUser({ id: userId, email: 'mine@example.com' })),
      },
      userPersistor: {
        createUser: jest.fn(),
        updateUser: jest
          .fn()
          .mockResolvedValue(makeUser({ id: userId, fullName: 'Test', email: 'mine@example.com' })),
        deleteUser: jest.fn(),
        anonymizeAccountForDeletion: jest.fn(),
      },
    })
    const updateProfile = makeUC(deps)

    await expect(
      updateProfile({
        userId,
        fullName: 'Test User',
        email: 'mine@example.com',
      })
    ).resolves.toMatchObject({ message: 'Profile updated successfully' })

    expect(deps.userPersistor.updateUser).toHaveBeenCalled()
  })
})
