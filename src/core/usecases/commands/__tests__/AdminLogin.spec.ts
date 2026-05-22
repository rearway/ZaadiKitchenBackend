import * as jwt from 'jsonwebtoken'
import * as bcrypt from 'bcrypt'
import { makeUC } from '../AdminLogin'
import { buildDeps, makeAdminUser } from '../../../../__tests__/helpers/mock-deps'

describe('AdminLogin', () => {
  const validInput = {
    email: 'admin@zaadikitchen.com',
    password: 'Admin@123',
    userAgent: 'Mozilla/5.0',
    ipAddress: '10.0.0.1',
  }

  async function makeHashedAdminUser(password = 'Admin@123') {
    const hashed = await bcrypt.hash(password, 10)
    return makeAdminUser({ password: hashed })
  }

  it('returns access and refresh tokens for valid admin credentials', async () => {
    const admin = await makeHashedAdminUser()
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(admin),
        getUserById: jest.fn().mockResolvedValue(admin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    const result = await adminLogin(validInput)

    expect(result.message).toBe('Admin logged in successfully')
    expect(result.data.accessToken).toBeTruthy()
    expect(result.data.refreshToken).toBeTruthy()
    expect(result.data.user.email).toBe('admin@zaadikitchen.com')
    expect((result.data.user as any).password).toBeUndefined()
  })

  it('embeds role and email in the JWT payload', async () => {
    const admin = await makeHashedAdminUser()
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(admin),
        getUserById: jest.fn().mockResolvedValue(admin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    const result = await adminLogin(validInput)

    const decoded = jwt.decode(result.data.accessToken) as jwt.JwtPayload
    expect(decoded.role).toBe('ADMIN')
    expect(decoded.email).toBe('admin@zaadikitchen.com')
  })

  it('stores the refresh token with user agent and IP', async () => {
    const admin = await makeHashedAdminUser()
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(admin),
        getUserById: jest.fn().mockResolvedValue(admin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await adminLogin(validInput)

    expect(deps.refreshTokenPersistor.createToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: admin.id,
        userAgent: 'Mozilla/5.0',
        ipAddress: '10.0.0.1',
      })
    )
  })

  it('throws AuthenticationError when the email does not exist', async () => {
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(null),
        getUserById: jest.fn().mockResolvedValue(null),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await expect(adminLogin(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError for a CUSTOMER trying admin login', async () => {
    const customer = await makeHashedAdminUser()
    const customerUser = { ...customer, role: 'CUSTOMER' }
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(customerUser),
        getUserById: jest.fn().mockResolvedValue(customerUser),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await expect(adminLogin(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError for a wrong password', async () => {
    const admin = await makeHashedAdminUser('correct_password')
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(admin),
        getUserById: jest.fn().mockResolvedValue(admin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await expect(adminLogin({ ...validInput, password: 'wrong_password' })).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError when the admin account has no password set', async () => {
    const admin = makeAdminUser({ password: null })
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(admin),
        getUserById: jest.fn().mockResolvedValue(admin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await expect(adminLogin(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('throws AuthenticationError for a deactivated admin account', async () => {
    const admin = await makeHashedAdminUser()
    const inactiveAdmin = { ...admin, isActive: false }
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(inactiveAdmin),
        getUserById: jest.fn().mockResolvedValue(inactiveAdmin),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    await expect(adminLogin(validInput)).rejects.toMatchObject({
      errorCode: 'AUTHENTICATION_ERROR',
      statusCode: 401,
    })
  })

  it('allows an OPS user to log in via admin login', async () => {
    const opsUser = await makeHashedAdminUser()
    const ops = { ...opsUser, role: 'OPS' }
    const deps = buildDeps({
      userLoader: {
        getUserByEmail: jest.fn().mockResolvedValue(ops),
        getUserById: jest.fn().mockResolvedValue(ops),
        getUserByPhone: jest.fn().mockResolvedValue(null),
      },
    })
    const adminLogin = makeUC(deps)

    const result = await adminLogin(validInput)
    expect(result.message).toBe('Admin logged in successfully')
  })
})
