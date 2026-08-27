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
import * as UpdateDeliveryLocation from './commands/UpdateDeliveryLocation.js'
import * as DeleteDeliveryLocation from './commands/DeleteDeliveryLocation.js'
import * as SetPrimaryDeliveryLocation from './commands/SetPrimaryDeliveryLocation.js'
import * as CreateDeliveryArea from './commands/CreateDeliveryArea.js'
import * as UpdateDeliveryArea from './commands/UpdateDeliveryArea.js'
import * as AddBuilding from './commands/AddBuilding.js'
import * as UpdateBuilding from './commands/UpdateBuilding.js'
import * as DeleteBuilding from './commands/DeleteBuilding.js'
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
import * as ExpireSubscriptions from './commands/ExpireSubscriptions.js'
import * as ToggleSaladForDay from './commands/ToggleSaladForDay.js'
import * as SwitchMealType from './commands/SwitchMealType.js'
import * as ValidateReferral from './commands/ValidateReferral.js'
import * as CreateMeal from './commands/CreateMeal.js'
import * as DeleteMeal from './commands/DeleteMeal.js'
import * as UpdateMeal from './commands/UpdateMeal.js'
import * as UpdateMealStatus from './commands/UpdateMealStatus.js'
import * as ImportMeals from './commands/ImportMeals.js'
import * as AssignMealToSlot from './commands/AssignMealToSlot.js'
import * as ClearMenuSlot from './commands/ClearMenuSlot.js'
import * as PublishMenuWeek from './commands/PublishMenuWeek.js'
import * as UnpublishMenuWeek from './commands/UnpublishMenuWeek.js'
import * as SubmitDeliveryIssue from './commands/SubmitDeliveryIssue.js'
import * as SubmitMealRating from './commands/SubmitMealRating.js'
import * as DeactivateCustomer from './commands/DeactivateCustomer.js'
import * as AdminCreditWallet from './commands/AdminCreditWallet.js'
import * as MarkDeliveryDelivered from './commands/MarkDeliveryDelivered.js'
import * as ReportRiderIssue from './commands/ReportRiderIssue.js'
import * as AdvancePipelineStage from './commands/AdvancePipelineStage.js'
import * as CreditDeliveryIssue from './commands/CreditDeliveryIssue.js'
import * as RejectDeliveryIssue from './commands/RejectDeliveryIssue.js'
import * as RegisterDevice from './commands/RegisterDevice.js'
import * as SendBulkBroadcast from './commands/SendBulkBroadcast.js'
import * as SyncPendingPayments from './commands/SyncPendingPayments.js'

import * as GetPendingRatings from './queries/GetPendingRatings.js'
import * as GetSubmittedRatings from './queries/GetSubmittedRatings.js'
import * as GetMealHistory from './queries/GetMealHistory.js'

import * as GetProfile from './queries/GetProfile.js'
import * as GetActiveDeliveryAreas from './queries/GetActiveDeliveryAreas.js'
import * as SearchDeliveryAreas from './queries/SearchDeliveryAreas.js'
import * as GetBuildingsForArea from './queries/GetBuildingsForArea.js'
import * as GetSavedDeliveryLocation from './queries/GetSavedDeliveryLocation.js'
import * as GetAdminDeliveryAreas from './queries/GetAdminDeliveryAreas.js'
import * as GetAdminBuildingsForArea from './queries/GetAdminBuildingsForArea.js'
import * as GetOutOfZoneRequests from './queries/GetOutOfZoneRequests.js'
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
import * as GetAdminMeals from './queries/GetAdminMeals.js'
import * as GetAdminMeal from './queries/GetAdminMeal.js'
import * as GetMenuWeeks from './queries/GetMenuWeeks.js'
import * as GetMenuWeek from './queries/GetMenuWeek.js'
import * as GetHome from './queries/GetHome.js'
import * as GetHomeThisWeek from './queries/GetHomeThisWeek.js'
import * as GetMenuMeta from './queries/GetMenuMeta.js'
import * as GetCustomerMenuWeek from './queries/GetCustomerMenuWeek.js'
import * as GetMealDetail from './queries/GetMealDetail.js'
import * as GetMealPhotoUploadUrl from './queries/GetMealPhotoUploadUrl.js'
import * as GetAdminCustomers from './queries/GetAdminCustomers.js'
import * as GetAdminCustomer from './queries/GetAdminCustomer.js'
import * as GetAdminCustomerHistory from './queries/GetAdminCustomerHistory.js'
import * as GetMyDeliveries from './queries/GetMyDeliveries.js'
import * as GetDailyOps from './queries/GetDailyOps.js'
import * as GetDeliveryLabels from './queries/GetDeliveryLabels.js'
import * as GenerateDeliveryLabelsPdf from './queries/GenerateDeliveryLabelsPdf.js'
import * as GenerateDeliverySheetExport from './queries/GenerateDeliverySheetExport.js'
import * as GetDashboardStats from './queries/GetDashboardStats.js'

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
  const updateDeliveryLocation = wrapUC(
    deps,
    UpdateDeliveryLocation.makeUC(deps),
    UpdateDeliveryLocation.name,
    ...defaultWrappers
  )
  const deleteDeliveryLocation = wrapUC(
    deps,
    DeleteDeliveryLocation.makeUC(deps),
    DeleteDeliveryLocation.name,
    ...defaultWrappers
  )
  const setPrimaryDeliveryLocation = wrapUC(
    deps,
    SetPrimaryDeliveryLocation.makeUC(deps),
    SetPrimaryDeliveryLocation.name,
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
  const updateBuilding = wrapUC(
    deps,
    UpdateBuilding.makeUC(deps),
    UpdateBuilding.name,
    ...defaultWrappers
  )
  const deleteBuilding = wrapUC(
    deps,
    DeleteBuilding.makeUC(deps),
    DeleteBuilding.name,
    ...defaultWrappers
  )
  const updateDeliveryArea = wrapUC(
    deps,
    UpdateDeliveryArea.makeUC(deps),
    UpdateDeliveryArea.name,
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
  const expireSubscriptions = wrapUC(
    deps,
    ExpireSubscriptions.makeUC(deps),
    ExpireSubscriptions.name,
    ...defaultWrappers
  )
  const toggleSaladForDay = wrapUC(
    deps,
    ToggleSaladForDay.makeUC(deps),
    ToggleSaladForDay.name,
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

  // Meal library commands
  const createMeal = wrapUC(
    deps,
    CreateMeal.makeUC(deps),
    CreateMeal.name,
    ...defaultWrappers
  )
  const updateMeal = wrapUC(
    deps,
    UpdateMeal.makeUC(deps),
    UpdateMeal.name,
    ...defaultWrappers
  )
  const updateMealStatus = wrapUC(
    deps,
    UpdateMealStatus.makeUC(deps),
    UpdateMealStatus.name,
    ...defaultWrappers
  )
  const deleteMeal = wrapUC(
    deps,
    DeleteMeal.makeUC(deps),
    DeleteMeal.name,
    ...defaultWrappers
  )
  const importMeals = wrapUC(
    deps,
    ImportMeals.makeUC(deps),
    ImportMeals.name,
    ...defaultWrappers
  )
  const assignMealToSlot = wrapUC(
    deps,
    AssignMealToSlot.makeUC(deps),
    AssignMealToSlot.name,
    ...defaultWrappers
  )
  const clearMenuSlot = wrapUC(
    deps,
    ClearMenuSlot.makeUC(deps),
    ClearMenuSlot.name,
    ...defaultWrappers
  )
  const publishMenuWeek = wrapUC(
    deps,
    PublishMenuWeek.makeUC(deps),
    PublishMenuWeek.name,
    ...defaultWrappers
  )
  const unpublishMenuWeek = wrapUC(
    deps,
    UnpublishMenuWeek.makeUC(deps),
    UnpublishMenuWeek.name,
    ...defaultWrappers
  )
  const submitDeliveryIssue = wrapUC(
    deps,
    SubmitDeliveryIssue.makeUC(deps),
    SubmitDeliveryIssue.name,
    ...defaultWrappers
  )
  const submitMealRating = wrapUC(
    deps,
    SubmitMealRating.makeUC(deps),
    SubmitMealRating.name,
    ...defaultWrappers
  )
  const deactivateCustomer = wrapUC(
    deps,
    DeactivateCustomer.makeUC(deps),
    DeactivateCustomer.name,
    ...defaultWrappers
  )
  const adminCreditWallet = wrapUC(
    deps,
    AdminCreditWallet.makeUC(deps),
    AdminCreditWallet.name,
    ...defaultWrappers
  )
  const markDeliveryDelivered = wrapUC(
    deps,
    MarkDeliveryDelivered.makeUC(deps),
    MarkDeliveryDelivered.name,
    ...defaultWrappers
  )
  const reportRiderIssue = wrapUC(
    deps,
    ReportRiderIssue.makeUC(deps),
    ReportRiderIssue.name,
    ...defaultWrappers
  )
  const advancePipelineStage = wrapUC(
    deps,
    AdvancePipelineStage.makeUC(deps),
    AdvancePipelineStage.name,
    ...defaultWrappers
  )
  const creditDeliveryIssue = wrapUC(
    deps,
    CreditDeliveryIssue.makeUC(deps),
    CreditDeliveryIssue.name,
    ...defaultWrappers
  )
  const rejectDeliveryIssue = wrapUC(
    deps,
    RejectDeliveryIssue.makeUC(deps),
    RejectDeliveryIssue.name,
    ...defaultWrappers
  )
  const registerDevice = wrapUC(
    deps,
    RegisterDevice.makeUC(deps),
    RegisterDevice.name,
    ...defaultWrappers
  )
  const sendBulkBroadcast = wrapUC(
    deps,
    SendBulkBroadcast.makeUC(deps),
    SendBulkBroadcast.name,
    ...defaultWrappers
  )
  const syncPendingPayments = wrapUC(
    deps,
    SyncPendingPayments.makeUC(deps),
    SyncPendingPayments.name,
    ...defaultWrappers
  )
  const getPendingRatings = wrapUC(
    deps,
    GetPendingRatings.makeUC(deps),
    GetPendingRatings.name,
    ...defaultWrappers
  )
  const getSubmittedRatings = wrapUC(
    deps,
    GetSubmittedRatings.makeUC(deps),
    GetSubmittedRatings.name,
    ...defaultWrappers
  )
  const getMealHistory = wrapUC(
    deps,
    GetMealHistory.makeUC(deps),
    GetMealHistory.name,
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
  const getAdminBuildingsForArea = wrapUC(
    deps,
    GetAdminBuildingsForArea.makeUC(deps),
    GetAdminBuildingsForArea.name,
    ...defaultWrappers
  )
  const getOutOfZoneRequests = wrapUC(
    deps,
    GetOutOfZoneRequests.makeUC(deps),
    GetOutOfZoneRequests.name,
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

  // Meal library & menu queries
  const getAdminMeals = wrapUC(
    deps,
    GetAdminMeals.makeUC(deps),
    GetAdminMeals.name,
    ...defaultWrappers
  )
  const getAdminMeal = wrapUC(
    deps,
    GetAdminMeal.makeUC(deps),
    GetAdminMeal.name,
    ...defaultWrappers
  )
  const getMenuWeeks = wrapUC(
    deps,
    GetMenuWeeks.makeUC(deps),
    GetMenuWeeks.name,
    ...defaultWrappers
  )
  const getMenuWeek = wrapUC(
    deps,
    GetMenuWeek.makeUC(deps),
    GetMenuWeek.name,
    ...defaultWrappers
  )
  const getHome = wrapUC(
    deps,
    GetHome.makeUC(deps),
    GetHome.name,
    ...defaultWrappers
  )
  const getHomeThisWeek = wrapUC(
    deps,
    GetHomeThisWeek.makeUC(deps),
    GetHomeThisWeek.name,
    ...defaultWrappers
  )
  const getMenuMeta = wrapUC(
    deps,
    GetMenuMeta.makeUC(deps),
    GetMenuMeta.name,
    ...defaultWrappers
  )
  const getCustomerMenuWeek = wrapUC(
    deps,
    GetCustomerMenuWeek.makeUC(deps),
    GetCustomerMenuWeek.name,
    ...defaultWrappers
  )
  const getMealDetail = wrapUC(
    deps,
    GetMealDetail.makeUC(deps),
    GetMealDetail.name,
    ...defaultWrappers
  )
  const getMealPhotoUploadUrl = wrapUC(
    deps,
    GetMealPhotoUploadUrl.makeUC(deps),
    GetMealPhotoUploadUrl.name,
    ...defaultWrappers
  )
  const getAdminCustomers = wrapUC(
    deps,
    GetAdminCustomers.makeUC(deps),
    GetAdminCustomers.name,
    ...defaultWrappers
  )
  const getAdminCustomer = wrapUC(
    deps,
    GetAdminCustomer.makeUC(deps),
    GetAdminCustomer.name,
    ...defaultWrappers
  )
  const getAdminCustomerHistory = wrapUC(
    deps,
    GetAdminCustomerHistory.makeUC(deps),
    GetAdminCustomerHistory.name,
    ...defaultWrappers
  )
  const getMyDeliveries = wrapUC(
    deps,
    GetMyDeliveries.makeUC(deps),
    GetMyDeliveries.name,
    ...defaultWrappers
  )
  const getDailyOps = wrapUC(
    deps,
    GetDailyOps.makeUC(deps),
    GetDailyOps.name,
    ...defaultWrappers
  )
  const getDeliveryLabels = wrapUC(
    deps,
    GetDeliveryLabels.makeUC(deps),
    GetDeliveryLabels.name,
    ...defaultWrappers
  )
  const generateDeliveryLabelsPdf = wrapUC(
    deps,
    GenerateDeliveryLabelsPdf.makeUC(deps),
    GenerateDeliveryLabelsPdf.name,
    ...defaultWrappers
  )
  const generateDeliverySheetExport = wrapUC(
    deps,
    GenerateDeliverySheetExport.makeUC(deps),
    GenerateDeliverySheetExport.name,
    ...defaultWrappers
  )
  const getDashboardStats = wrapUC(
    deps,
    GetDashboardStats.makeUC(deps),
    GetDashboardStats.name,
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
      getAdminBuildingsForArea,
      getOutOfZoneRequests,
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
      getAdminMeals,
      getAdminMeal,
      getMenuWeeks,
      getMenuWeek,
      getHome,
      getHomeThisWeek,
      getMenuMeta,
      getCustomerMenuWeek,
      getMealDetail,
      getMealPhotoUploadUrl,
      getPendingRatings,
      getSubmittedRatings,
      getMealHistory,
      getAdminCustomers,
      getAdminCustomer,
      getAdminCustomerHistory,
      getMyDeliveries,
      getDailyOps,
      getDeliveryLabels,
      generateDeliveryLabelsPdf,
      generateDeliverySheetExport,
      getDashboardStats,
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
      updateDeliveryLocation,
      deleteDeliveryLocation,
      setPrimaryDeliveryLocation,
      createDeliveryArea,
      updateDeliveryArea,
      addBuilding,
      updateBuilding,
      deleteBuilding,
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
      expireSubscriptions,
      toggleSaladForDay,
      switchMealType,
      validateReferral,
      createMeal,
      deleteMeal,
      updateMeal,
      updateMealStatus,
      importMeals,
      assignMealToSlot,
      clearMenuSlot,
      publishMenuWeek,
      unpublishMenuWeek,
      submitDeliveryIssue,
      submitMealRating,
      deactivateCustomer,
      adminCreditWallet,
      markDeliveryDelivered,
      reportRiderIssue,
      advancePipelineStage,
      creditDeliveryIssue,
      rejectDeliveryIssue,
      registerDevice,
      sendBulkBroadcast,
      syncPendingPayments,
    },
  }
}

export type UseCases = ReturnType<typeof initUseCases>
