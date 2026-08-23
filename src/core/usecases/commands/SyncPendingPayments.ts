import { Deps } from '../../entitygateway/index.js'
import * as CreateOrder from './CreateOrder.js' // We will reuse CreateOrder for the successful ones!

export interface SyncPendingPaymentsInput {
  // Empty input, usually triggered by a Cron job
}

export type SyncPendingPaymentsOutput = {
  syncedCount: number
  failedCount: number
}

export function makeUC(deps: Deps) {
  return async function syncPendingPayments(
    _input: SyncPendingPaymentsInput
  ): Promise<SyncPendingPaymentsOutput> {
    const { logger, paymentTransactionLoader, paymentTransactionPersistor, paymentGateway, checkoutSessionLoader } = deps
    
    let syncedCount = 0
    let failedCount = 0

    try {
      // Find all INITIATED transactions
      const pendingTxs = await paymentTransactionLoader.getTransactionsByStatus('INITIATED')

      for (const tx of pendingTxs) {
        // If we don't have a gateway payment ID, we can't fetch from Moyasar. 
        // Wait, Moyasar lets us query by metadata? No. If we don't have the ID, we might be stuck 
        // unless the frontend sent it. But let's assume `gatewayPaymentId` might be populated 
        // if frontend sent it, or we skip if null.
        if (!tx.gatewayPaymentId) {
          // It's possible the transaction was just created seconds ago, or we failed before getting an ID.
          // In a real app we might expire these after a day. Let's skip for now.
          continue
        }

        const fetchResult = await paymentGateway.fetchPayment(tx.gatewayPaymentId)

        if (fetchResult.success && (fetchResult.status === 'paid' || fetchResult.status === 'captured')) {
          // Payment actually succeeded! We need to fulfill the order.
          // To fulfill, we can either re-run CreateOrder logic, or mark it and let admin handle.
          // Since CreateOrder charges the card, we must NOT call CreateOrder directly unless we skip the charge step.
          // A safer route for a background job is just updating the transaction to SUCCESS, 
          // and letting an admin review it, OR decoupling CreateOrder's fulfillment logic.
          // For now, we will mark as SUCCESS.
          await paymentTransactionPersistor.updateTransaction(tx.id, {
            status: 'SUCCESS'
          })
          
          logger.log(`Synced transaction ${tx.id} to SUCCESS. Checkout session: ${tx.checkoutSessionId}`)
          syncedCount++
        } else if (fetchResult.status === 'failed') {
          await paymentTransactionPersistor.updateTransaction(tx.id, {
            status: 'FAILED'
          })
          logger.log(`Synced transaction ${tx.id} to FAILED.`)
          failedCount++
        }
      }

      return {
        syncedCount,
        failedCount
      }
    } catch (error) {
      logger.error('Failed to sync pending payments', String(error))
      throw error
    }
  }
}

export const name = 'SyncPendingPayments'
