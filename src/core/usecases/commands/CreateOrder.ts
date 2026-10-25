import type { Deps } from '../../entitygateway/index.js'
import type { PaymentTransaction } from '../../entities/PaymentTransaction.js'
import {
  isSettledPaymentStatus,
  walletCoversDebit,
} from '../../constants/payment-status.js'
import {
  CheckoutAlreadyCompletedError,
  InsufficientWalletBalanceError,
  PaymentFailedError,
  ResourceNotFoundError,
  SessionExpiredError,
  ActiveSubscriptionCheckoutBlockedError,
} from '../../../shared/errors/index.js'
import {
  fulfillPaidCheckout,
  fulfillmentIsStale,
  resolveCheckoutPaymentMethod,
  resolveWalletOnlyCheckoutPayment,
  type CreateOrderOutput,
} from './fulfillPaidCheckout.js'
import { canUpgradeSubscriptionPlan } from '../services/subscriptionServicePeriod.js'
import {
  computeCheckoutWalletAndDue,
  needsGatewayCharge,
  shouldRefreshCheckoutWallet,
} from '../services/checkoutWalletUtils.js'

export type { CreateOrderOutput } from './fulfillPaidCheckout.js'

export interface CreateOrderInput {
  userId: string
  sessionId: string
  paymentMethodId: string
  startDate: string
}

const PAYMENT_UNKNOWN_MESSAGE =
  'We could not confirm the payment. Please try again with the same checkout. You will not be charged twice.'

function pickPaymentIntent(
  txs: PaymentTransaction[]
): PaymentTransaction | null {
  return (
    txs.find(tx => tx.status === 'SUCCESS') ??
    txs.find(tx => tx.status === 'FULFILLING') ??
    txs.find(tx => tx.status === 'PAID_UNFULFILLED') ??
    txs.find(tx => tx.status === 'INITIATED') ??
    null
  )
}

function assertWalletCoversSession(
  balanceSar: number,
  walletCreditSar: number
): void {
  if (!walletCoversDebit(balanceSar, walletCreditSar)) {
    throw new InsufficientWalletBalanceError()
  }
}

export function makeUC(deps: Deps) {
  return async function createOrder(
    input: CreateOrderInput
  ): Promise<CreateOrderOutput> {
    const { logger } = deps

    try {
      const { userId, sessionId, paymentMethodId, startDate } = input

      let session = await deps.checkoutSessionLoader.getSessionById(sessionId)
      if (
        !session ||
        session.userId !== userId ||
        session.status === 'expired'
      ) {
        throw new SessionExpiredError(
          'Your 10-minute checkout session has expired. Your plan selection is saved — just start checkout again.'
        )
      }
      if (session.status === 'active' && new Date() > session.expiresAt) {
        throw new SessionExpiredError(
          'Your 10-minute checkout session has expired. Your plan selection is saved — just start checkout again.'
        )
      }

      let walletBalanceAtCheckout: number | undefined
      if (session.status === 'active') {
        walletBalanceAtCheckout =
          await deps.walletLoader.getBalanceByUserId(userId)
        const { walletCreditSar, totalDueSar } = computeCheckoutWalletAndDue(
          session,
          walletBalanceAtCheckout
        )
        if (shouldRefreshCheckoutWallet(session, { walletCreditSar, totalDueSar })) {
          await deps.checkoutSessionPersistor.updateSession(sessionId, {
            walletCreditSar,
            totalDueSar,
          })
          session = { ...session, walletCreditSar, totalDueSar }
        }
      }

      const existingTxs =
        await deps.paymentTransactionLoader.getTransactionsByCheckoutSessionId(
          sessionId
        )
      const openTx = pickPaymentIntent(existingTxs)
      const resumingSettled =
        openTx?.status === 'SUCCESS' ||
        openTx?.status === 'PAID_UNFULFILLED' ||
        openTx?.status === 'FULFILLING'

      if (session.status === 'confirmed' && !openTx) {
        throw new CheckoutAlreadyCompletedError()
      }
      if (session.status === 'confirmed' && openTx?.status === 'FAILED') {
        throw new CheckoutAlreadyCompletedError()
      }

      if (openTx?.status === 'SUCCESS' && openTx.gatewayPaymentId) {
        const existingOrder = await deps.orderLoader.getOrderByGatewayPaymentId(
          openTx.gatewayPaymentId
        )
        if (existingOrder?.subscriptionId) {
          throw new CheckoutAlreadyCompletedError()
        }
      }

      const methodId = openTx?.paymentMethodId || paymentMethodId
      const resolved = needsGatewayCharge(session.totalDueSar)
        ? await resolveCheckoutPaymentMethod(deps, userId, methodId)
        : resolveWalletOnlyCheckoutPayment(methodId)

      const plan = await deps.planLoader.getPlanById(session.planId)
      if (!plan) throw new ResourceNotFoundError('Plan', session.planId)

      if (!resumingSettled) {
        const promotionSubscriptionId = session.promotionSubscriptionId ?? null
        const liveSub =
          await deps.subscriptionLoader.getActiveSubscriptionByUserId(userId)
        if (promotionSubscriptionId) {
          if (
            !liveSub ||
            liveSub.id !== promotionSubscriptionId ||
            !canUpgradeSubscriptionPlan(liveSub)
          ) {
            throw new ActiveSubscriptionCheckoutBlockedError(
              'Your subscription changed after checkout started. Please start checkout again.'
            )
          }
        } else if (liveSub) {
          throw new ActiveSubscriptionCheckoutBlockedError()
        }
      }

      if (session.walletCreditSar > 0 && !openTx) {
        const balance =
          walletBalanceAtCheckout ??
          (await deps.walletLoader.getBalanceByUserId(userId))
        assertWalletCoversSession(balance, session.walletCreditSar)
      }

      if (session.status === 'active') {
        const claimed =
          await deps.checkoutSessionPersistor.claimSession(sessionId)
        if (!claimed) throw new CheckoutAlreadyCompletedError()
      }

      let paymentTx = openTx
      if (!paymentTx) {
        paymentTx = await deps.paymentTransactionPersistor.createTransaction({
          userId,
          checkoutSessionId: sessionId,
          amountSar: session.totalDueSar,
          status: 'INITIATED',
          startDate,
          paymentMethodId,
        })
      } else if (!paymentTx.startDate || !paymentTx.paymentMethodId) {
        await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
          startDate: paymentTx.startDate ?? startDate,
          paymentMethodId: paymentTx.paymentMethodId ?? paymentMethodId,
        })
        paymentTx = {
          ...paymentTx,
          startDate: paymentTx.startDate ?? startDate,
          paymentMethodId: paymentTx.paymentMethodId ?? paymentMethodId,
        }
      }

      const fulfill = (gatewayPaymentId: string | null) =>
        fulfillPaidCheckout(deps, {
          userId,
          session,
          plan,
          paymentMethodId: methodId,
          hardcoded: resolved.hardcoded,
          resolvedMethod: resolved.method,
          gatewayPaymentId,
          paymentTransactionId: paymentTx.id,
          alreadyFulfilling:
            paymentTx.status === 'FULFILLING' && fulfillmentIsStale(paymentTx),
          startDate: paymentTx.startDate ?? startDate,
        })

      if (resumingSettled) {
        return fulfill(paymentTx.gatewayPaymentId)
      }

      if (!needsGatewayCharge(session.totalDueSar)) {
        const walletGatewayId = `wallet:${paymentTx.id}`
        await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
          status: 'PAID_UNFULFILLED',
          gatewayPaymentId: walletGatewayId,
        })
        return fulfill(walletGatewayId)
      }

      const reusedAttempt = openTx?.status === 'INITIATED'
      if (reusedAttempt) {
        const fetched = await deps.paymentGateway.fetchPayment(
          paymentTx.gatewayPaymentId || paymentTx.id
        )
        if (isSettledPaymentStatus(fetched.status)) {
          const gatewayPaymentId = fetched.gatewayPaymentId || paymentTx.id
          await deps.paymentTransactionPersistor.updateTransaction(
            paymentTx.id,
            {
              status: 'PAID_UNFULFILLED',
              gatewayPaymentId,
            }
          )
          return fulfill(gatewayPaymentId)
        }
        if (fetched.status === 'failed' || fetched.status === 'voided') {
          await deps.paymentTransactionPersistor.updateTransaction(
            paymentTx.id,
            {
              status: 'FAILED',
              gatewayPaymentId: fetched.gatewayPaymentId || null,
            }
          )
          await deps.checkoutSessionPersistor.updateSession(sessionId, {
            status: 'active',
          })
          throw new PaymentFailedError('Payment could not be processed.')
        }
        if (fetched.status !== 'not_found' && fetched.status !== 'error') {
          await deps.paymentTransactionPersistor.updateTransaction(
            paymentTx.id,
            {
              status: 'INITIATED',
              gatewayPaymentId:
                fetched.gatewayPaymentId || paymentTx.gatewayPaymentId,
            }
          )
          await deps.checkoutSessionPersistor.updateSession(sessionId, {
            status: 'active',
          })
          throw new PaymentFailedError(
            fetched.status === 'authorized'
              ? 'Payment is authorized but not captured yet. Please try again shortly.'
              : PAYMENT_UNKNOWN_MESSAGE
          )
        }
        if (session.walletCreditSar > 0) {
          const balance =
            walletBalanceAtCheckout ??
            (await deps.walletLoader.getBalanceByUserId(userId))
          assertWalletCoversSession(balance, session.walletCreditSar)
        }
      }

      const intentStartDate = paymentTx.startDate ?? startDate
      const chargeResult = await deps.paymentGateway.charge({
        amountSar: session.totalDueSar,
        paymentToken: resolved.method.token,
        orderId: paymentTx.id,
        idempotencyKey: paymentTx.id,
        description: `${plan.name} · ${intentStartDate}`,
        metadata: {
          checkoutSessionId: sessionId,
          startDate: intentStartDate,
          paymentMethodId: methodId,
        },
      })

      if (!chargeResult.success) {
        const gatewayPaymentId = chargeResult.gatewayPaymentId || paymentTx.id
        if (chargeResult.ambiguous) {
          await deps.paymentTransactionPersistor.updateTransaction(
            paymentTx.id,
            {
              status: 'INITIATED',
              gatewayPaymentId,
            }
          )
          await deps.checkoutSessionPersistor.updateSession(sessionId, {
            status: 'active',
          })
          throw new PaymentFailedError(
            chargeResult.status === 'authorized'
              ? 'Payment is authorized but not captured yet. Please try again shortly.'
              : PAYMENT_UNKNOWN_MESSAGE
          )
        }
        await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
          status: 'FAILED',
          gatewayPaymentId: chargeResult.gatewayPaymentId || null,
        })
        await deps.checkoutSessionPersistor.updateSession(sessionId, {
          status: 'active',
        })
        throw new PaymentFailedError(
          chargeResult.errorMessage ?? 'Payment could not be processed.'
        )
      }

      const gatewayPaymentId = chargeResult.gatewayPaymentId
      await deps.paymentTransactionPersistor.updateTransaction(paymentTx.id, {
        status: 'PAID_UNFULFILLED',
        gatewayPaymentId,
      })
      return fulfill(gatewayPaymentId)
    } catch (error) {
      logger.error(
        'Failed to create order',
        error instanceof Error ? error.message : String(error)
      )
      throw error
    }
  }
}

export const name = 'CreateOrder'
