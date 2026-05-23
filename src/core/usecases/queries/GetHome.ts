import type { Deps } from '../../entitygateway/index.js'
import type { Subscription } from '../../entities/Subscription.js'
import type { Plan } from '../../entities/Plan.js'

export interface GetHomeInput {
  userId: string
}

export interface GetHomeOutput {
  user: {
    first_name: string
    language: string
  }
  subscription_status: 'none' | 'active' | 'expired' | 'paused' | 'cancelled'
  subscription: Record<string, unknown> | null
  delivery_location: {
    building: string
    floor: string | null
    area_name: string
  } | null
  wallet_balance_sar: number | null
  banner: Record<string, unknown>
  quick_actions: Record<string, unknown>[] | null
  plans: Array<{
    id: string
    name: string
    price_sar: number
    meal_count: number
    price_per_meal_sar: number
    is_most_popular: boolean
    is_current_plan?: boolean
    is_last_plan?: boolean
    cta_label: string
  }>
}

function getSubscriptionStatus(sub: Subscription | null): 'none' | 'active' | 'expired' | 'paused' | 'cancelled' {
  if (!sub) return 'none'
  return sub.status as 'active' | 'expired' | 'paused' | 'cancelled'
}

function formatEndDateLabel(endDate: string): string {
  const d = new Date(endDate)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `Ends ${d.getUTCDate()} ${months[d.getUTCMonth()]}`
}

function getTimeOfDayGreeting(): string {
  const hour = new Date().getUTCHours() + 3  // AST = UTC+3
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function buildBanner(
  status: 'none' | 'active' | 'expired' | 'paused' | 'cancelled',
  sub: Subscription | null,
  firstName: string,
  location: { buildingName: string; floor?: string; areaName?: string } | null
): Record<string, unknown> {
  if (status === 'none') {
    return {
      theme: 'red',
      headline: 'Fresh lunch, delivered daily.',
      subtext: 'From our kitchen to your desk. Every day.',
      primary_cta: { label: 'Start for SAR 28 →', action: 'navigate_plan_selection' },
      secondary_cta: { label: 'Browse menu →', action: 'navigate_menu_tab' },
    }
  }

  if (status === 'active' && sub) {
    const daysRemaining = Math.max(0, Math.ceil(
      (new Date(sub.endDate).getTime() - Date.now()) / 86400000
    ))
    const locationLabel = location
      ? `📍 ${location.buildingName}${location.floor ? ' · ' + location.floor : ''}`
      : null
    return {
      theme: 'black',
      plan_label: `${sub.mealType === 'executive' ? 'Executive' : 'Salad'} Plan`,
      greeting: `${getTimeOfDayGreeting()}, ${firstName} 👋`,
      days_remaining_label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`,
      end_date_label: formatEndDateLabel(sub.endDate),
      location_label: locationLabel,
      location_edit_action: 'navigate_edit_location',
    }
  }

  if (status === 'expired' && sub) {
    return {
      theme: 'red',
      status_pill: 'Expired',
      primary_cta: { label: 'Renew →', action: 'navigate_plan_selection_returning' },
    }
  }

  if (status === 'paused' && sub) {
    const pausedSince = sub.pausedFrom ?? sub.updatedAt?.toString?.() ?? ''
    const daysFrozen = pausedSince
      ? Math.ceil((Date.now() - new Date(pausedSince).getTime()) / 86400000)
      : 0
    const pausedDate = pausedSince ? new Date(pausedSince) : null
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const pauseLabel = pausedDate
      ? `${daysFrozen} day${daysFrozen !== 1 ? 's' : ''} frozen · Paused ${pausedDate.getUTCDate()} ${months[pausedDate.getUTCMonth()]}`
      : `${daysFrozen} days frozen`
    return {
      theme: 'black',
      status_pill: 'Paused',
      pause_label: pauseLabel,
      primary_cta: { label: 'Resume →', action: 'open_resume_modal' },
    }
  }

  if (status === 'cancelled' && sub) {
    return {
      theme: 'black',
      status_pill: 'Cancelled',
      primary_cta: { label: 'Renew →', action: 'navigate_plan_selection_returning' },
    }
  }

  return { theme: 'red' }
}

function buildQuickActions(
  status: 'none' | 'active' | 'expired' | 'paused' | 'cancelled'
): Record<string, unknown>[] | null {
  if (status === 'active') {
    return [
      {
        id: 'skip',
        label: 'Skip a day',
        icon: '⏭',
        subtext: 'Before 6 PM cutoff · No charge',
        action: 'navigate_skip_screen',
        theme: 'red_tint',
      },
      {
        id: 'pause',
        label: 'Pause anytime',
        icon: '⏸',
        subtext: 'Freeze your plan · No charge',
        action: 'open_pause_modal',
        theme: 'grey',
      },
    ]
  }
  if (status === 'paused') {
    return [
      {
        id: 'resume',
        label: 'Resume Now',
        icon: '▶️',
        action: 'open_resume_modal',
        theme: 'red_tint',
      },
      {
        id: 'browse_menu',
        label: 'Browse Menu',
        icon: '🍽',
        action: 'navigate_menu_tab',
        theme: 'white',
      },
    ]
  }
  return null
}

function buildPlans(
  plans: Plan[],
  status: 'none' | 'active' | 'expired' | 'paused' | 'cancelled',
  sub: Subscription | null
) {
  const isRenewing = status === 'expired' || status === 'cancelled'
  const isActive = status === 'active' || status === 'paused'

  return plans.map(p => {
    const isCurrentPlan = isActive && sub?.planId === p.id
    const isLastPlan = isRenewing && sub?.planId === p.id

    let ctaLabel = 'Subscribe →'
    if (isRenewing) ctaLabel = 'Renew →'
    else if (isActive) ctaLabel = 'Switch →'

    const base = {
      id: p.slug,
      name: p.name,
      price_sar: p.priceSar,
      meal_count: p.mealCount,
      price_per_meal_sar: p.pricePerMealSar,
      is_most_popular: p.isMostPopular,
      cta_label: ctaLabel,
    }

    if (isActive) return { ...base, is_current_plan: isCurrentPlan }
    if (isRenewing) return { ...base, is_last_plan: isLastPlan }
    return base
  })
}

export function makeUC(deps: Deps) {
  return async function getHome(input: GetHomeInput): Promise<GetHomeOutput> {
    const { logger, userLoader, subscriptionLoader, deliveryLocationLoader, deliveryAreaLoader, walletLoader, planLoader } = deps

    try {
      const [user, sub, plans] = await Promise.all([
        userLoader.getUserById(input.userId),
        subscriptionLoader.getActiveSubscriptionByUserId(input.userId),
        planLoader.getActivePlans(),
      ])

      const status = getSubscriptionStatus(sub)
      const needsLocation = status === 'active'
      const needsWallet = status === 'active' || status === 'expired'

      const [location, walletBalance] = await Promise.all([
        needsLocation ? deliveryLocationLoader.getPrimaryLocationByUserId(input.userId) : Promise.resolve(null),
        needsWallet ? walletLoader.getBalanceByUserId(input.userId) : Promise.resolve(null),
      ])

      const area = location ? await deliveryAreaLoader.getAreaById(location.areaId) : null

      const firstName = user?.fullName?.split(' ')[0] ?? 'there'
      const locEntity = location ? { ...location, areaName: area?.name } : null

      const subOutput = sub
        ? status === 'active'
          ? {
              subscription_id: sub.id,
              plan_name: plans.find(p => p.id === sub.planId)?.name ?? sub.planId,
              meal_type: sub.mealType,
              days_remaining: Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / 86400000)),
              end_date: sub.endDate,
              end_date_label: formatEndDateLabel(sub.endDate),
              skip_days_remaining: Math.max(0, sub.skipDaysAllowed - sub.skipDaysUsed),
              pause_days_remaining: Math.max(0, sub.pauseDaysAllowed - sub.pauseDaysUsed),
            }
          : status === 'paused'
          ? {
              subscription_id: sub.id,
              plan_name: plans.find(p => p.id === sub.planId)?.name ?? sub.planId,
              meal_type: sub.mealType,
              paused_since: sub.pausedFrom,
              days_frozen: sub.pausedFrom
                ? Math.ceil((Date.now() - new Date(sub.pausedFrom).getTime()) / 86400000)
                : 0,
              pause_ceiling_date: sub.pauseCeilingDate,
            }
          : {
              plan_name: plans.find(p => p.id === sub.planId)?.name ?? sub.planId,
              meal_type: sub.mealType,
              end_date: sub.endDate,
            }
        : null

      return {
        user: {
          first_name: firstName,
          language: user?.languagePreference ?? 'EN',
        },
        subscription_status: status,
        subscription: subOutput,
        delivery_location: locEntity
          ? {
              building: locEntity.buildingName,
              floor: locEntity.floor ?? null,
              area_name: locEntity.areaName ?? locEntity.areaId,
            }
          : null,
        wallet_balance_sar: walletBalance,
        banner: buildBanner(status, sub, firstName, locEntity),
        quick_actions: buildQuickActions(status),
        plans: buildPlans(plans, status, sub),
      }
    } catch (error) {
      logger.error('GetHome failed', error instanceof Error ? error.message : String(error))
      throw error
    }
  }
}

export const name = 'GetHome'
