import type { Deps } from '../entitygateway/index.js'
import { wrapUC, defaultWrappers } from './wrappers.js'

import * as SendOtp from './commands/SendOtp.js'
import * as VerifyOtp from './commands/VerifyOtp.js'
import * as AdminLogin from './commands/AdminLogin.js'
import * as RefreshAccessToken from './commands/RefreshAccessToken.js'
import * as Logout from './commands/Logout.js'
import * as AdminLogout from './commands/AdminLogout.js'
import * as UpdateProfile from './commands/UpdateProfile.js'
import * as UpdateLanguagePreference from './commands/UpdateLanguagePreference.js'
import * as SubmitOutOfZoneInterest from './commands/SubmitOutOfZoneInterest.js'
import * as SaveDeliveryLocation from './commands/SaveDeliveryLocation.js'
import * as CreateDeliveryArea from './commands/CreateDeliveryArea.js'
import * as AddBuilding from './commands/AddBuilding.js'
import * as CreateCheckoutSession from './commands/CreateCheckoutSession.js'
import * as ApplyPromoCode from './commands/ApplyPromoCode.js'
import * as RemovePromoCode from './commands/RemovePromoCode.js'
import * as AddPaymentMethod from './commands/AddPaymentMethod.js'
import * as RemovePaymentMethod from './commands/RemovePaymentMethod.js'
import * as CreateOrder from './commands/CreateOrder.js'
import * as SkipDelivery from './commands/SkipDelivery.js'
import * as UndoSkipDelivery from './commands/UndoSkipDelivery.js'
import * as PauseSubscription from './commands/PauseSubscription.js'
import * as ResumeSubscription from './commands/ResumeSubscription.js'
import * as CancelSubscription from './commands/CancelSubscription.js'
import * as SwitchMealType from './commands/SwitchMealType.js'
import * as ValidateReferral from './commands/ValidateReferral.js'

import * as GetProfile from './queries/GetProfile.js'
import * as GetActiveDeliveryAreas from './queries/GetActiveDeliveryAreas.js'
import * as SearchDeliveryAreas from './queries/SearchDeliveryAreas.js'
import * as GetBuildingsForArea from './queries/GetBuildingsForArea.js'
import * as GetSavedDeliveryLocation from './queries/GetSavedDeliveryLocation.js'
import * as GetAdminDeliveryAreas from './queries/GetAdminDeliveryAreas.js'
import * as GetPlans from './queries/GetPlans.js'
import * as GetActivePlans from './queries/GetActivePlans.js'
import * as GetCheckoutSession from './queries/GetCheckoutSession.js'
import * as GetDeliveryStartDates from './queries/GetDeliveryStartDates.js'
import * as GetPaymentMethods from './queries/GetPaymentMethods.js'
import * as GetOrder from './queries/GetOrder.js'
import * as GetSubscription from './queries/GetSubscription.js'
import * as GetSubscriptionDeliveries from './queries/GetSubscriptionDeliveries.js'
import * as GetWallet from './queries/GetWallet.js'
import * as GetWalletTransactions from './queries/GetWalletTransactions.js'
import * as GetReferral from './queries/GetReferral.js'
import * as GetPublicHolidays from './queries/GetPublicHolidays.js'

export function initUseCases(deps: Deps) {
  // Auth commands
  const sendOtp = wrapUC(
    deps,
    SendOtp.makeUC(deps),
    SendOtp.name,
    ...defaultWrappers
  )
  const verifyOtp = wrapUC(
    deps,
    VerifyOtp.makeUC(deps),
    VerifyOtp.name,
    ...defaultWrappers
  )
  const adminLogin = wrapUC(
    deps,
    AdminLogin.makeUC(deps),
    AdminLogin.name,
    ...defaultWrappers
  )
  const refreshAccessToken = wrapUC(
    deps,
    RefreshAccessToken.makeUC(deps),
    RefreshAccessToken.name,
    ...defaultWrappers
  )
  const logout = wrapUC(
    deps,
    Logout.makeUC(deps),
    Logout.name,
    ...defaultWrappers
  )
  const adminLogout = wrapUC(
    deps,
    AdminLogout.makeUC(deps),
    AdminLogout.name,
    ...defaultWrappers
  )

  // User commands
  const updateProfile = wrapUC(
    deps,
    UpdateProfile.makeUC(deps),
    UpdateProfile.name,
    ...defaultWrappers
  )
  const updateLanguagePreference = wrapUC(
    deps,
    UpdateLanguagePreference.makeUC(deps),
    UpdateLanguagePreference.name,
    ...defaultWrappers
  )
  const submitOutOfZoneInterest = wrapUC(
    deps,
    SubmitOutOfZoneInterest.makeUC(deps),
    SubmitOutOfZoneInterest.name,
    ...defaultWrappers
  )
  const saveDeliveryLocation = wrapUC(
    deps,
    SaveDeliveryLocation.makeUC(deps),
    SaveDeliveryLocation.name,
    ...defaultWrappers
  )
  const createDeliveryArea = wrapUC(
    deps,
    CreateDeliveryArea.makeUC(deps),
    CreateDeliveryArea.name,
    ...defaultWrappers
  )
  const addBuilding = wrapUC(
    deps,
    AddBuilding.makeUC(deps),
    AddBuilding.name,
    ...defaultWrappers
  )

  // Checkout commands
  const createCheckoutSession = wrapUC(
    deps,
    CreateCheckoutSession.makeUC(deps),
    CreateCheckoutSession.name,
    ...defaultWrappers
  )
  const applyPromoCode = wrapUC(
    deps,
    ApplyPromoCode.makeUC(deps),
    ApplyPromoCode.name,
    ...defaultWrappers
  )
  const removePromoCode = wrapUC(
    deps,
    RemovePromoCode.makeUC(deps),
    RemovePromoCode.name,
    ...defaultWrappers
  )

  // Payment commands
  const addPaymentMethod = wrapUC(
    deps,
    AddPaymentMethod.makeUC(deps),
    AddPaymentMethod.name,
    ...defaultWrappers
  )
  const removePaymentMethod = wrapUC(
    deps,
    RemovePaymentMethod.makeUC(deps),
    RemovePaymentMethod.name,
    ...defaultWrappers
  )

  // Order commands
  const createOrder = wrapUC(
    deps,
    CreateOrder.makeUC(deps),
    CreateOrder.name,
    ...defaultWrappers
  )

  // Subscription commands
  const skipDelivery = wrapUC(
    deps,
    SkipDelivery.makeUC(deps),
    SkipDelivery.name,
    ...defaultWrappers
  )
  const undoSkipDelivery = wrapUC(
    deps,
    UndoSkipDelivery.makeUC(deps),
    UndoSkipDelivery.name,
    ...defaultWrappers
  )
  const pauseSubscription = wrapUC(
    deps,
    PauseSubscription.makeUC(deps),
    PauseSubscription.name,
    ...defaultWrappers
  )
  const resumeSubscription = wrapUC(
    deps,
    ResumeSubscription.makeUC(deps),
    ResumeSubscription.name,
    ...defaultWrappers
  )
  const cancelSubscription = wrapUC(
    deps,
    CancelSubscription.makeUC(deps),
    CancelSubscription.name,
    ...defaultWrappers
  )
  const switchMealType = wrapUC(
    deps,
    SwitchMealType.makeUC(deps),
    SwitchMealType.name,
    ...defaultWrappers
  )

  // Referral commands
  const validateReferral = wrapUC(
    deps,
    ValidateReferral.makeUC(deps),
    ValidateReferral.name,
    ...defaultWrappers
  )

  // Queries
  const getProfile = wrapUC(
    deps,
    GetProfile.makeUC(deps),
    GetProfile.name,
    ...defaultWrappers
  )
  const getActiveDeliveryAreas = wrapUC(
    deps,
    GetActiveDeliveryAreas.makeUC(deps),
    GetActiveDeliveryAreas.name,
    ...defaultWrappers
  )
  const searchDeliveryAreas = wrapUC(
    deps,
    SearchDeliveryAreas.makeUC(deps),
    SearchDeliveryAreas.name,
    ...defaultWrappers
  )
  const getBuildingsForArea = wrapUC(
    deps,
    GetBuildingsForArea.makeUC(deps),
    GetBuildingsForArea.name,
    ...defaultWrappers
  )
  const getSavedDeliveryLocation = wrapUC(
    deps,
    GetSavedDeliveryLocation.makeUC(deps),
    GetSavedDeliveryLocation.name,
    ...defaultWrappers
  )
  const getAdminDeliveryAreas = wrapUC(
    deps,
    GetAdminDeliveryAreas.makeUC(deps),
    GetAdminDeliveryAreas.name,
    ...defaultWrappers
  )
  const getPlans = wrapUC(
    deps,
    GetPlans.makeUC(deps),
    GetPlans.name,
    ...defaultWrappers
  )
  const getActivePlans = wrapUC(
    deps,
    GetActivePlans.makeUC(deps),
    GetActivePlans.name,
    ...defaultWrappers
  )
  const getCheckoutSession = wrapUC(
    deps,
    GetCheckoutSession.makeUC(deps),
    GetCheckoutSession.name,
    ...defaultWrappers
  )
  const getDeliveryStartDates = wrapUC(
    deps,
    GetDeliveryStartDates.makeUC(deps),
    GetDeliveryStartDates.name,
    ...defaultWrappers
  )
  const getPaymentMethods = wrapUC(
    deps,
    GetPaymentMethods.makeUC(deps),
    GetPaymentMethods.name,
    ...defaultWrappers
  )
  const getOrder = wrapUC(
    deps,
    GetOrder.makeUC(deps),
    GetOrder.name,
    ...defaultWrappers
  )
  const getSubscription = wrapUC(
    deps,
    GetSubscription.makeUC(deps),
    GetSubscription.name,
    ...defaultWrappers
  )
  const getSubscriptionDeliveries = wrapUC(
    deps,
    GetSubscriptionDeliveries.makeUC(deps),
    GetSubscriptionDeliveries.name,
    ...defaultWrappers
  )
  const getWallet = wrapUC(
    deps,
    GetWallet.makeUC(deps),
    GetWallet.name,
    ...defaultWrappers
  )
  const getWalletTransactions = wrapUC(
    deps,
    GetWalletTransactions.makeUC(deps),
    GetWalletTransactions.name,
    ...defaultWrappers
  )
  const getReferral = wrapUC(
    deps,
    GetReferral.makeUC(deps),
    GetReferral.name,
    ...defaultWrappers
  )
  const getPublicHolidays = wrapUC(
    deps,
    GetPublicHolidays.makeUC(deps),
    GetPublicHolidays.name,
    ...defaultWrappers
  )

  return {
    queries: {
      getProfile,
      getActiveDeliveryAreas,
      searchDeliveryAreas,
      getBuildingsForArea,
      getSavedDeliveryLocation,
      getAdminDeliveryAreas,
      getPlans,
      getActivePlans,
      getCheckoutSession,
      getDeliveryStartDates,
      getPaymentMethods,
      getOrder,
      getSubscription,
      getSubscriptionDeliveries,
      getWallet,
      getWalletTransactions,
      getReferral,
      getPublicHolidays,
    },
    commands: {
      sendOtp,
      verifyOtp,
      adminLogin,
      refreshAccessToken,
      logout,
      adminLogout,
      updateProfile,
      updateLanguagePreference,
      submitOutOfZoneInterest,
      saveDeliveryLocation,
      createDeliveryArea,
      addBuilding,
      createCheckoutSession,
      applyPromoCode,
      removePromoCode,
      addPaymentMethod,
      removePaymentMethod,
      createOrder,
      skipDelivery,
      undoSkipDelivery,
      pauseSubscription,
      resumeSubscription,
      cancelSubscription,
      switchMealType,
      validateReferral,
    },
  }
}

export type UseCases = ReturnType<typeof initUseCases>
