import type { Deps } from '../../entitygateway/index.js'
import { isSettledPaymentStatus } from '../../constants/payment-status.js'
import { webhookSecretsMatch } from '../../constants/webhook-secret.js'
import { AuthenticationError } from '../../../shared/errors/index.js'
import { resumePaidCheckout } from './fulfillPaidCheckout.js'

export interface HandleMoyasarWebhookInput {
  payload: unknown
}

export interface HandleMoyasarWebhookOutput {
  received: true
}

const SETTLED_EVENTS = new Set(['payment_paid', 'payment_captured'])

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function metadataOf(
  data: Record<string, unknown> | null
): Record<string, string> {
  const raw = data?.metadata
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      out[key] = String(value)
    }
  }
  return out
}

/**
 * Moyasar signs webhooks by echoing the dashboard secret as `secret_token`.
 * Subscriptions are activated only for payment_paid and payment_captured.
 * `payment_authorized` is acknowledged and ignored.
 * The handler is idempotent: a second delivery for the same payment does not
 * create a second subscription. HTTP 200 is returned for accepted events,
 * including duplicates and fulfill errors that are left for reconcile.
 */
export function makeUC(deps: Deps) {
  return async function handleMoyasarWebhook(
    input: HandleMoyasarWebhookInput
  ): Promise<HandleMoyasarWebhookOutput> {
    const body = asRecord(input.payload)
    const provided =
      typeof body?.secret_token === 'string' ? body.secret_token : ''
    if (!webhookSecretsMatch(provided, deps.moyasarWebhookSecret)) {
      throw new AuthenticationError('Invalid Moyasar webhook secret')
    }

    const type = typeof body?.type === 'string' ? body.type : ''
    const data = asRecord(body?.data)
    const status = typeof data?.status === 'string' ? data.status : ''
    const gatewayPaymentId = typeof data?.id === 'string' ? data.id : ''
    const metadata = metadataOf(data)

    if (type === 'payment_authorized' || status === 'authorized') {
      deps.logger.log(
        'Ignoring Moyasar authorized webhook until capture',
        gatewayPaymentId
      )
      return { received: true }
    }

    const settled =
      SETTLED_EVENTS.has(type) &&
      (status === '' || isSettledPaymentStatus(status))
    if (!settled) {
      if (type === 'payment_faild' || status === 'failed') {
        await markFailedIfStillOpen(deps, gatewayPaymentId, metadata.orderId)
      }
      return { received: true }
    }

    try {
      await settlePaidEvent(deps, gatewayPaymentId, metadata)
    } catch (error) {
      deps.logger.error(
        'Moyasar webhook failed to finish subscription; left for reconcile',
        error instanceof Error ? error.message : String(error)
      )
    }
    return { received: true }
  }
}

async function findTransaction(
  deps: Deps,
  gatewayPaymentId: string,
  orderId: string | undefined
) {
  if (orderId) {
    const byIntent =
      await deps.paymentTransactionLoader.getTransactionById(orderId)
    if (byIntent) return byIntent
  }
  if (gatewayPaymentId) {
    const byId =
      await deps.paymentTransactionLoader.getTransactionById(gatewayPaymentId)
    if (byId) return byId
    return deps.paymentTransactionLoader.getTransactionByGatewayPaymentId(
      gatewayPaymentId
    )
  }
  return null
}

async function markFailedIfStillOpen(
  deps: Deps,
  gatewayPaymentId: string,
  orderId: string | undefined
): Promise<void> {
  const tx = await findTransaction(deps, gatewayPaymentId, orderId)
  if (!tx || tx.status !== 'INITIATED') return
  await deps.paymentTransactionPersistor.updateTransaction(tx.id, {
    status: 'FAILED',
    gatewayPaymentId: gatewayPaymentId || tx.gatewayPaymentId,
  })
  await deps.checkoutSessionPersistor.updateSession(tx.checkoutSessionId, {
    status: 'active',
  })
}

async function settlePaidEvent(
  deps: Deps,
  gatewayPaymentId: string,
  metadata: Record<string, string>
): Promise<void> {
  const tx = await findTransaction(deps, gatewayPaymentId, metadata.orderId)
  if (!tx) {
    deps.logger.error(
      'Moyasar paid webhook did not match a payment intent',
      gatewayPaymentId || 'unknown'
    )
    return
  }
  if (tx.status === 'SUCCESS') return

  const startDate = tx.startDate ?? metadata.startDate ?? null
  const paymentMethodId = tx.paymentMethodId ?? metadata.paymentMethodId ?? null
  await deps.paymentTransactionPersistor.updateTransaction(tx.id, {
    status: tx.status === 'FULFILLING' ? tx.status : 'PAID_UNFULFILLED',
    gatewayPaymentId: gatewayPaymentId || tx.gatewayPaymentId,
    startDate,
    paymentMethodId,
  })

  if (!startDate || !paymentMethodId) {
    deps.logger.error(
      `Paid payment ${tx.id} is missing start date or payment method; left for reconcile`,
      gatewayPaymentId
    )
    return
  }

  await resumePaidCheckout(
    deps,
    {
      ...tx,
      status: tx.status === 'FULFILLING' ? 'FULFILLING' : 'PAID_UNFULFILLED',
      gatewayPaymentId: gatewayPaymentId || tx.gatewayPaymentId,
      startDate,
      paymentMethodId,
    },
    gatewayPaymentId || tx.gatewayPaymentId
  )
}

export const name = 'HandleMoyasarWebhook'
