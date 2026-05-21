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
import * as GetProfile from './queries/GetProfile.js'
import * as GetActiveDeliveryAreas from './queries/GetActiveDeliveryAreas.js'
import * as SearchDeliveryAreas from './queries/SearchDeliveryAreas.js'
import * as GetBuildingsForArea from './queries/GetBuildingsForArea.js'
import * as GetSavedDeliveryLocation from './queries/GetSavedDeliveryLocation.js'
import * as GetAdminDeliveryAreas from './queries/GetAdminDeliveryAreas.js'
import * as SubmitOutOfZoneInterest from './commands/SubmitOutOfZoneInterest.js'
import * as SaveDeliveryLocation from './commands/SaveDeliveryLocation.js'
import * as CreateDeliveryArea from './commands/CreateDeliveryArea.js'
import * as AddBuilding from './commands/AddBuilding.js'

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
  const addBuilding = wrapUC(
    deps,
    AddBuilding.makeUC(deps),
    AddBuilding.name,
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
    },
  }
}

export type UseCases = ReturnType<typeof initUseCases>
