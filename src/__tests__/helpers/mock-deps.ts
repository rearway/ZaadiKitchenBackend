import type { Deps } from '../../core/entitygateway/index.js'

// ─── Entity fixtures ──────────────────────────────────────────────────────────

export const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-uuid-1',
  phone: '+966512345678',
  email: null as string | null,
  fullName: 'Test User',
  role: 'CUSTOMER' as const,
  isActive: true,
  password: null as string | null,
  referralCode: 'TESTCODE1',
  languagePreference: 'EN' as const,
  pushNotificationToken: null as string | null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
})

export const makeAdminUser = (overrides: Record<string, unknown> = {}) =>
  makeUser({
    id: 'admin-uuid-1',
    email: 'admin@zaadikitchen.com',
    phone: null,
    role: 'ADMIN',
    password: '$2b$10$hashedpassword',
    referralCode: null,
    ...overrides,
  })

export const makeOtpSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'otp-uuid-1',
  phone: '+966512345678',
  code: '1234',
  expiresAt: new Date(Date.now() + 120_000),
  isVerified: false,
  attemptCount: 0,
  lockedUntil: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeRefreshToken = (overrides: Record<string, unknown> = {}) => ({
  id: 'rtoken-uuid-1',
  userId: 'user-uuid-1',
  token: 'test-refresh-token-value',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  isRevoked: false,
  userAgent: 'TestAgent/1.0',
  ipAddress: '127.0.0.1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makePlan = (overrides: Record<string, unknown> = {}) => ({
  id: 'plan-uuid-month',
  name: 'Month Plan',
  slug: 'month',
  priceSar: 500,
  mealCount: 22,
  pricePerMealSar: 22.7,
  skipDaysAllowed: 66,
  pauseDaysAllowed: 66,
  isMostPopular: true,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeCheckoutSession = (overrides: Record<string, unknown> = {}) => ({
  id: 'sess-uuid-1',
  userId: 'user-uuid-1',
  planId: 'plan-uuid-month',
  mealType: 'executive' as const,
  basePriceSar: 500,
  walletCreditSar: 0,
  promoDiscountSar: 0,
  totalDueSar: 500,
  promoCode: null as string | null,
  promoAttemptCount: 0,
  promoLocked: false,
  status: 'active' as const,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makePaymentMethod = (overrides: Record<string, unknown> = {}) => ({
  id: 'pm-uuid-1',
  userId: 'user-uuid-1',
  type: 'mada',
  token: 'tok_test_xxxx',
  label: 'Mada ····4242',
  isDefault: true,
  isLastUsed: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-uuid-1',
  userId: 'user-uuid-1',
  subscriptionId: null as string | null,
  planId: 'plan-uuid-month',
  paymentMethodId: 'pm-uuid-1',
  mealType: 'executive' as const,
  mealCount: 22,
  startDate: '2025-06-01',
  planPriceSar: 500,
  walletCreditSar: 0,
  promoDiscountSar: 0,
  promoCode: null as string | null,
  discountLabel: null as string | null,
  totalPaidSar: 500,
  paymentMethodType: 'mada',
  paymentMethodLabel: 'Mada ····4242',
  gatewayPaymentId: 'mock_pay_123',
  status: 'confirmed' as const,
  isNewUser: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeSubscription = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-uuid-1',
  userId: 'user-uuid-1',
  orderId: 'order-uuid-1',
  planId: 'plan-uuid-month',
  mealType: 'executive' as const,
  status: 'active' as const,
  totalMealDays: 22,
  deliveredCount: 0,
  skippedCount: 0,
  startDate: '2025-06-01',
  endDate: '2025-07-01',
  skipDaysAllowed: 66,
  skipDaysUsed: 0,
  pauseDaysAllowed: 66,
  pauseDaysUsed: 0,
  pausedFrom: null as string | null,
  pausedUntil: null as string | null,
  pauseCeilingDate: null as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeDeliveryDay = (overrides: Record<string, unknown> = {}) => ({
  id: 'dd-uuid-1',
  subscriptionId: 'sub-uuid-1',
  userId: 'user-uuid-1',
  date: '2025-06-01',
  mealType: 'executive' as const,
  mealName: null as string | null,
  status: 'scheduled' as const,
  deliveredAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeDeliveryArea = (overrides: Record<string, unknown> = {}) => ({
  id: 'area-uuid-1',
  name: 'Al Nakheel',
  description: 'Business district',
  status: 'active' as const,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
})

export const makeBuilding = (overrides: Record<string, unknown> = {}) => ({
  id: 'building-uuid-1',
  areaId: 'area-uuid-1',
  name: 'Al Nakheel Tower',
  floorsCount: undefined as number | undefined,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
})

export const makeDeliveryLocation = (overrides: Record<string, unknown> = {}) => ({
  id: 'loc-uuid-1',
  userId: 'user-uuid-1',
  areaId: 'area-uuid-1',
  buildingId: 'building-uuid-1' as string | undefined,
  buildingName: 'Al Nakheel Tower',
  floor: undefined as string | undefined,
  deskArea: undefined as string | undefined,
  deliveryPreference: 'hand_to_me' as const,
  riderNotes: undefined as string | undefined,
  isPrimary: true,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
})

export const makePromoCode = (overrides: Record<string, unknown> = {}) => ({
  id: 'promo-uuid-1',
  code: 'TESTREF10',
  type: 'referral' as const,
  discountSar: 100,
  ownerUserId: 'user-uuid-referrer',
  validForPlanSlug: null as string | null,
  maxUses: 100 as number | null,
  timesUsed: 0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

// ─── Mock Deps factory ────────────────────────────────────────────────────────

export function buildDeps(overrides: Partial<Deps> = {}): Deps {
  const base: Deps = {
    logger: {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as Deps['logger'],

    skipOtp: true,
    jwtSecret: 'test-jwt-secret-key-at-least-32-chars-long',
    jwtAccessExpiration: '15m',
    jwtRefreshExpirationMobile: '30d',
    jwtRefreshExpirationAdmin: '8h',

    userLoader: {
      getUserById: jest.fn().mockResolvedValue(null),
      getUserByPhone: jest.fn().mockResolvedValue(null),
      getUserByEmail: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['userLoader'],

    userPersistor: {
      createUser: jest.fn().mockResolvedValue(makeUser()),
      updateUser: jest.fn().mockResolvedValue(makeUser()),
    } as unknown as Deps['userPersistor'],

    otpSessionLoader: {
      getActiveSession: jest.fn().mockResolvedValue(null),
      getLockedSession: jest.fn().mockResolvedValue(null),
      getRecentAttemptCount: jest.fn().mockResolvedValue(0),
    } as unknown as Deps['otpSessionLoader'],

    otpSessionPersistor: {
      createSession: jest.fn().mockResolvedValue(makeOtpSession()),
      markVerified: jest.fn().mockResolvedValue(undefined),
      incrementAttempt: jest.fn().mockResolvedValue(undefined),
      lockPhone: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['otpSessionPersistor'],

    refreshTokenLoader: {
      getTokenByValue: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['refreshTokenLoader'],

    refreshTokenPersistor: {
      createToken: jest.fn().mockResolvedValue(makeRefreshToken()),
      revokeToken: jest.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['refreshTokenPersistor'],

    otpService: {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['otpService'],

    deliveryAreaLoader: {
      getAreaById: jest.fn().mockResolvedValue(null),
      getAreaByName: jest.fn().mockResolvedValue(null),
      getActiveAreas: jest.fn().mockResolvedValue([]),
      searchAreas: jest.fn().mockResolvedValue([]),
      getAllAreas: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['deliveryAreaLoader'],

    deliveryAreaPersistor: {
      createArea: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['deliveryAreaPersistor'],

    buildingLoader: {
      getBuildingsByArea: jest.fn().mockResolvedValue([]),
      searchBuildingsByArea: jest.fn().mockResolvedValue([]),
      getBuildingById: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['buildingLoader'],

    buildingPersistor: {
      createBuilding: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['buildingPersistor'],

    outOfZoneInterestPersistor: {
      createInterest: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['outOfZoneInterestPersistor'],

    outOfZoneInterestLoader: {
      getAggregatedRequests: jest.fn().mockResolvedValue({ areas: [], total: 0, totalRequests: 0 }),
    } as unknown as Deps['outOfZoneInterestLoader'],

    deliveryLocationLoader: {
      getPrimaryLocationByUserId: jest.fn().mockResolvedValue(null),
      getLocationsByUserId: jest.fn().mockResolvedValue([]),
      getLocationById: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['deliveryLocationLoader'],

    deliveryLocationPersistor: {
      createLocation: jest.fn().mockResolvedValue(makeDeliveryLocation()),
      updateLocation: jest.fn().mockResolvedValue(makeDeliveryLocation()),
      deleteLocation: jest.fn().mockResolvedValue(undefined),
      setPrimaryLocation: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['deliveryLocationPersistor'],

    planLoader: {
      getPlanBySlug: jest.fn().mockResolvedValue(null),
      getPlanById: jest.fn().mockResolvedValue(null),
      getAllPlans: jest.fn().mockResolvedValue([]),
      getActivePlans: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['planLoader'],

    planPersistor: {
      createPlan: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['planPersistor'],

    checkoutSessionLoader: {
      getSessionById: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['checkoutSessionLoader'],

    checkoutSessionPersistor: {
      createSession: jest.fn().mockResolvedValue(makeCheckoutSession()),
      updateSession: jest.fn().mockResolvedValue(makeCheckoutSession()),
      expireAllUserSessions: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['checkoutSessionPersistor'],

    promoCodeLoader: {
      getPromoByCode: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['promoCodeLoader'],

    promoCodePersistor: {
      incrementTimesUsed: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['promoCodePersistor'],

    paymentMethodLoader: {
      getMethodById: jest.fn().mockResolvedValue(null),
      getMethodsByUserId: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['paymentMethodLoader'],

    paymentMethodPersistor: {
      createMethod: jest.fn().mockResolvedValue(makePaymentMethod()),
      deleteMethod: jest.fn().mockResolvedValue(undefined),
      markAsLastUsed: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['paymentMethodPersistor'],

    orderLoader: {
      getOrderById: jest.fn().mockResolvedValue(null),
      getLastOrderByUserId: jest.fn().mockResolvedValue(null),
      hasUserUsedPromoCode: jest.fn().mockResolvedValue(false),
    } as unknown as Deps['orderLoader'],

    orderPersistor: {
      createOrder: jest.fn().mockResolvedValue(makeOrder()),
      updateOrder: jest.fn().mockResolvedValue(makeOrder()),
    } as unknown as Deps['orderPersistor'],

    subscriptionLoader: {
      getActiveSubscriptionByUserId: jest.fn().mockResolvedValue(null),
      getSubscriptionById: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['subscriptionLoader'],

    subscriptionPersistor: {
      createSubscription: jest.fn().mockResolvedValue(makeSubscription()),
      updateSubscription: jest.fn().mockResolvedValue(undefined),
      expireActiveSubscriptions: jest.fn().mockResolvedValue(0),
    } as unknown as Deps['subscriptionPersistor'],

    deliveryDayLoader: {
      getDeliveryDayByDate: jest.fn().mockResolvedValue(null),
      getDeliveryDaysBySubscription: jest.fn().mockResolvedValue([]),
      getDeliveryDayById: jest.fn().mockResolvedValue(null),
      getDeliveryHistory: jest.fn().mockResolvedValue({ days: [], total: 0 }),
      getRiderDeliveriesByDate: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['deliveryDayLoader'],

    deliveryDayPersistor: {
      bulkCreateDeliveryDays: jest.fn().mockResolvedValue([makeDeliveryDay()]),
      updateDeliveryDayStatus: jest.fn().mockResolvedValue(undefined),
      markDeliveryDelivered: jest.fn().mockResolvedValue(makeDeliveryDay({ status: 'delivered', deliveredAt: new Date() })),
      bulkUpdateDeliveryDayStatus: jest.fn().mockResolvedValue(0),
      updateMealTypeForSubscription: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['deliveryDayPersistor'],

    publicHolidayLoader: {
      getHolidayDates: jest.fn().mockResolvedValue([]),
      getHolidaysByYear: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['publicHolidayLoader'],

    publicHolidayPersistor: {
      createHoliday: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['publicHolidayPersistor'],

    walletLoader: {
      getBalanceByUserId: jest.fn().mockResolvedValue(0),
      getTransactionsByUserId: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['walletLoader'],

    walletPersistor: {
      createTransaction: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['walletPersistor'],

    referralLoader: {
      getReferralStatsByUserId: jest.fn().mockResolvedValue({
        referralCode: 'MOCK1234',
        friendsJoined: 0,
        totalEarnedSar: 0,
      }),
      getReferralHistory: jest.fn().mockResolvedValue([]),
      getReferralByCode: jest.fn().mockResolvedValue(null),
      hasUserBeenReferred: jest.fn().mockResolvedValue(false),
    } as unknown as Deps['referralLoader'],

    referralPersistor: {
      createReferral: jest.fn().mockResolvedValue(undefined),
      markRewarded: jest.fn().mockResolvedValue(undefined),
      ensureReferralCode: jest.fn().mockResolvedValue('MOCK1234'),
    } as unknown as Deps['referralPersistor'],

    paymentGateway: {
      charge: jest.fn().mockResolvedValue({
        success: true,
        gatewayPaymentId: 'mock_pay_uuid',
      }),
    } as unknown as Deps['paymentGateway'],

    mealLoader: {
      getMealById: jest.fn().mockResolvedValue(null),
      getMealByName: jest.fn().mockResolvedValue(null),
      getMeals: jest.fn().mockResolvedValue({ meals: [], total: 0 }),
      getMealsByIds: jest.fn().mockResolvedValue([]),
      getMealsInWeek: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['mealLoader'],

    mealPersistor: {
      createMeal: jest.fn().mockResolvedValue(null),
      deleteMeal: jest.fn().mockResolvedValue(undefined),
      updateMeal: jest.fn().mockResolvedValue(null),
      updateMealStatus: jest.fn().mockResolvedValue(null),
      bulkCreateMeals: jest.fn().mockResolvedValue({ created: [], skipped: 0, errors: [] }),
      incrementTimesServed: jest.fn().mockResolvedValue(undefined),
      updateLastServed: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['mealPersistor'],

    menuWeekLoader: {
      getWeekById: jest.fn().mockResolvedValue(null),
      getWeeks: jest.fn().mockResolvedValue([]),
      getSlotsByWeekId: jest.fn().mockResolvedValue([]),
      getSlotById: jest.fn().mockResolvedValue(null),
      getMealsInWeek: jest.fn().mockResolvedValue([]),
      getMenuForDateRange: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['menuWeekLoader'],

    menuWeekPersistor: {
      ensureWeekExists: jest.fn().mockResolvedValue({ week: null, slots: [] }),
      assignMealToSlot: jest.fn().mockResolvedValue(null),
      clearSlot: jest.fn().mockResolvedValue(null),
      publishWeek: jest.fn().mockResolvedValue(null),
      transitionPastWeeks: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['menuWeekPersistor'],

    storageGateway: {
      getPresignedUploadUrl: jest.fn().mockResolvedValue('https://s3.example.com/upload'),
      getPublicUrl: jest.fn().mockReturnValue('https://s3.example.com/meals/test/photo.jpeg'),
    } as unknown as Deps['storageGateway'],

    auditLogPersistor: {
      createAuditLog: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['auditLogPersistor'],

    auditLogLoader: {
      getAuditLogsBySubscription: jest.fn().mockResolvedValue([]),
      getAuditLogsByUser: jest.fn().mockResolvedValue([]),
    } as unknown as Deps['auditLogLoader'],

    deliveryIssuePersistor: {
      createIssue: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['deliveryIssuePersistor'],

    deliveryIssueLoader: {
      getIssuesBySubscription: jest.fn().mockResolvedValue([]),
      getIssueById: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['deliveryIssueLoader'],

    mealRatingPersistor: {
      createRating: jest.fn().mockResolvedValue(null),
    } as unknown as Deps['mealRatingPersistor'],

    mealRatingLoader: {
      getRatingByDeliveryDay: jest.fn().mockResolvedValue(null),
      getPendingRatingDays: jest.fn().mockResolvedValue([]),
      getRatingsByUser: jest.fn().mockResolvedValue({ ratings: [], total: 0 }),
    } as unknown as Deps['mealRatingLoader'],

    adminCustomerLoader: {
      listCustomers: jest.fn().mockResolvedValue({ customers: [], total: 0 }),
      getCustomerDetail: jest.fn().mockResolvedValue(null),
      getCustomerHistory: jest.fn().mockResolvedValue({ subscriptions: [], deliveries: [], issues: [] }),
    } as unknown as Deps['adminCustomerLoader'],

    adminCustomerPersistor: {
      deactivateCustomer: jest.fn().mockResolvedValue(undefined),
    } as unknown as Deps['adminCustomerPersistor'],

    riderIssuePersistor: {
      createRiderIssue: jest.fn().mockResolvedValue({
        id: 'rider-issue-uuid-1',
        deliveryDayId: 'dd-uuid-1',
        riderId: 'rider-uuid-1',
        issueType: 'customer_not_found',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    } as unknown as Deps['riderIssuePersistor'],
  }

  return { ...base, ...overrides }
}
