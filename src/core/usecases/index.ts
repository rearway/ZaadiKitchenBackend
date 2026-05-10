import type { Deps } from '../entitygateway/index.js'
import { wrapUC, defaultWrappers } from './wrappers.js'

import * as SendOtp from './commands/SendOtp.js'
import * as VerifyOtp from './commands/VerifyOtp.js'
import * as AdminLogin from './commands/AdminLogin.js'
import * as RefreshAccessToken from './commands/RefreshAccessToken.js'
import * as Logout from './commands/Logout.js'
import * as AdminLogout from './commands/AdminLogout.js'

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

    return {
        queries: {},
        commands: {
            sendOtp,
            verifyOtp,
            adminLogin,
            refreshAccessToken,
            logout,
            adminLogout,
        },
    }
}

export type UseCases = ReturnType<typeof initUseCases>
