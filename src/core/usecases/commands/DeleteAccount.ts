import type { Deps } from '../../entitygateway/index.js'
import { UserRole } from '../../../codecs/enums.js'
import {
  AuthenticationError,
  ResourceNotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js'

export interface DeleteAccountInput {
  userId: string
  confirm: boolean
}

export interface DeleteAccountOutput {
  message: string
  data: {
    deleted_at: string
    subscription_cancelled: boolean
  }
}

export function makeUC(deps: Deps) {
  return async function deleteAccount(
    input: DeleteAccountInput
  ): Promise<DeleteAccountOutput> {
    const {
      logger,
      userLoader,
      userPersistor,
      subscriptionLoader,
      subscriptionPersistor,
      refreshTokenPersistor,
      userDevicePersistor,
      deliveryLocationLoader,
      deliveryLocationPersistor,
      auditLogPersistor,
    } = deps

    try {
      if (!input.confirm) {
        throw new ValidationError('Account deletion must be confirmed', {
          field: 'confirm',
        })
      }

      const user = await userLoader.getUserById(input.userId)
      if (!user) {
        throw new ResourceNotFoundError('User', input.userId)
      }

      if (user.deletedAt) {
        return {
          message: 'Account already deleted',
          data: {
            deleted_at: user.deletedAt.toISOString(),
            subscription_cancelled: false,
          },
        }
      }

      if (user.role === UserRole.ADMIN || user.role === UserRole.OPS) {
        throw new AuthenticationError(
          'Admin and Ops accounts cannot be deleted via this endpoint.'
        )
      }

      let subscriptionCancelled = false
      const subscription =
        await subscriptionLoader.getActiveSubscriptionByUserId(input.userId)
      if (
        subscription &&
        subscription.status !== 'cancelled' &&
        subscription.status !== 'expired'
      ) {
        await subscriptionPersistor.updateSubscription(subscription.id, {
          status: 'cancelled',
        })
        await auditLogPersistor.createAuditLog({
          userId: input.userId,
          subscriptionId: subscription.id,
          action: 'cancel_subscription',
        })
        subscriptionCancelled = true
      }

      const locations = await deliveryLocationLoader.getLocationsByUserId(
        input.userId
      )
      for (const location of locations) {
        await deliveryLocationPersistor.deleteLocation(location.id)
      }

      await refreshTokenPersistor.revokeAllUserTokens(input.userId)
      await userDevicePersistor.deactivateAllDevicesForUser(input.userId)

      const anonymized = await userPersistor.anonymizeAccountForDeletion(
        input.userId
      )

      await auditLogPersistor.createAuditLog({
        userId: input.userId,
        subscriptionId: null,
        action: 'delete_account',
      })

      logger.log(`User account anonymized: ${input.userId}`)

      return {
        message: 'Account deleted successfully',
        data: {
          deleted_at: anonymized.deletedAt!.toISOString(),
          subscription_cancelled: subscriptionCancelled,
        },
      }
    } catch (error) {
      logger.error(
        'Failed to delete account',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'DeleteAccount'
