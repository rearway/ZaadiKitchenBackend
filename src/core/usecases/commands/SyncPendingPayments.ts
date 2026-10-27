import type { Deps } from '../../entitygateway/index.js'
import type { PaymentTransaction } from '../../entities/PaymentTransaction.js'
import { isSettledPaymentStatus } from '../../constants/payment-status.js'
import {
  fulfillmentIsStale,
  resumePaidCheckout,
} from './fulfillPaidCheckout.js'

/** Triggered by POST /internal/jobs/sync-pending-payments. */
export type SyncPendingPaymentsInput = Record<string, never>

export type SyncPendingPaymentsOutput = {
  syncedCount: number
  failedCount: number
}

function isWalletOnly(tx: PaymentTransaction): boolean {
  return (
    Math.round(tx.amountSar * 100) <= 0 ||
    (tx.gatewayPaymentId ?? '').startsWith('wallet:')
  )
}

export function makeUC(deps: Deps) {
  return async function syncPendingPayments(
    _input: SyncPendingPaymentsInput
  ): Promise<SyncPendingPaymentsOutput> {
    const { logger } = deps
    let syncedCount = 0
    let failedCount = 0

    try {
      const initiated =
        await deps.paymentTransactionLoader.getTransactionsByStatus('INITIATED')
      const unfulfilled =
        await deps.paymentTransactionLoader.getTransactionsByStatus(
          'PAID_UNFULFILLED'
        )
      const fulfilling =
        await deps.paymentTransactionLoader.getTransactionsByStatus(
          'FULFILLING'
        )

      for (const tx of initiated) {
        try {
          if (isWalletOnly(tx)) {
            const gatewayPaymentId = tx.gatewayPaymentId ?? `wallet:${tx.id}`
            await deps.paymentTransactionPersistor.updateTransaction(tx.id, {
              status: 'PAID_UNFULFILLED',
              gatewayPaymentId,
            })
            await resumePaidCheckout(
              deps,
              { ...tx, status: 'PAID_UNFULFILLED' },
              gatewayPaymentId
            )
            syncedCount++
            continue
          }

          const fetched = await deps.paymentGateway.fetchPayment(
            tx.gatewayPaymentId || tx.id
          )
          if (isSettledPaymentStatus(fetched.status)) {
            const gatewayPaymentId = fetched.gatewayPaymentId || tx.id
            await deps.paymentTransactionPersistor.updateTransaction(tx.id, {
              status: 'PAID_UNFULFILLED',
              gatewayPaymentId,
              startDate: tx.startDate ?? fetched.metadata?.startDate ?? null,
              paymentMethodId:
                tx.paymentMethodId ?? fetched.metadata?.paymentMethodId ?? null,
            })
            await resumePaidCheckout(
              deps,
              {
                ...tx,
                status: 'PAID_UNFULFILLED',
                gatewayPaymentId,
                startDate: tx.startDate ?? fetched.metadata?.startDate ?? null,
                paymentMethodId:
                  tx.paymentMethodId ??
                  fetched.metadata?.paymentMethodId ??
                  null,
              },
              gatewayPaymentId
            )
            logger.log(
              `Fulfilled paid transaction ${tx.id} for checkout ${tx.checkoutSessionId}`
            )
            syncedCount++
          } else if (
            fetched.status === 'failed' ||
            fetched.status === 'voided'
          ) {
            await deps.paymentTransactionPersistor.updateTransaction(tx.id, {
              status: 'FAILED',
              gatewayPaymentId: fetched.gatewayPaymentId || tx.gatewayPaymentId,
            })
            await deps.checkoutSessionPersistor.updateSession(
              tx.checkoutSessionId,
              {
                status: 'active',
              }
            )
            logger.log(`Synced transaction ${tx.id} to FAILED.`)
            failedCount++
          }
        } catch (error) {
          logger.error(
            `Failed to reconcile transaction ${tx.id}`,
            error instanceof Error ? error.message : String(error)
          )
          failedCount++
        }
      }

      for (const tx of [...unfulfilled, ...fulfilling]) {
        if (tx.status === 'FULFILLING' && !fulfillmentIsStale(tx)) continue
        try {
          await resumePaidCheckout(deps, tx, tx.gatewayPaymentId)
          logger.log(
            `Fulfilled ${tx.status} transaction ${tx.id} for checkout ${tx.checkoutSessionId}`
          )
          syncedCount++
        } catch (error) {
          logger.error(
            `Failed to fulfill transaction ${tx.id}`,
            error instanceof Error ? error.message : String(error)
          )
          failedCount++
        }
      }

      return { syncedCount, failedCount }
    } catch (error) {
      logger.error('Failed to sync pending payments', String(error))
      throw error
    }
  }
}

export const name = 'SyncPendingPayments'
