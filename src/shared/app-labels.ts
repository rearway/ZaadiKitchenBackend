/**
 * Bilingual display labels for mobile (EN + AR).
 * Stable `key` values are what the app maps from API codes / wallet labels.
 * Editable via `app_settings.labels` (merged over these defaults).
 */

export interface LocalizedLabel {
  key: string
  name_en: string
  name_ar: string
}

export interface AppLabelsCatalog {
  plans: LocalizedLabel[]
  wallet: LocalizedLabel[]
  billing_categories: LocalizedLabel[]
  transaction_types: LocalizedLabel[]
  promo: LocalizedLabel[]
}

export const DEFAULT_APP_LABELS: AppLabelsCatalog = {
  plans: [
    { key: 'try_it', name_en: 'Try It', name_ar: 'جرّبها' },
    { key: 'week', name_en: 'Week Plan', name_ar: 'الخطة الأسبوعية' },
    { key: 'month', name_en: 'Month Plan', name_ar: 'الخطة الشهرية' },
    { key: 'quarterly', name_en: 'Quarterly', name_ar: 'الخطة الربع سنوية' },
  ],
  wallet: [
    { key: 'admin_credit', name_en: 'Admin Credit', name_ar: 'رصيد من الإدارة' },
    {
      key: 'referral_reward',
      name_en: 'Referral reward',
      name_ar: 'مكافأة الإحالة',
    },
    { key: 'issue_credit', name_en: 'Issue credit', name_ar: 'رصيد تعويض' },
    { key: 'wallet', name_en: 'Wallet', name_ar: 'المحفظة' },
    { key: 'plan_upgrade', name_en: 'Plan upgrade', name_ar: 'ترقية الخطة' },
    {
      key: 'plan_upgrade_credit',
      name_en: 'Plan upgrade credit',
      name_ar: 'رصيد ترقية الخطة',
    },
  ],
  billing_categories: [
    {
      key: 'wallet_ledger',
      name_en: 'Wallet',
      name_ar: 'المحفظة',
    },
    {
      key: 'subscription_payment',
      name_en: 'Subscription payment',
      name_ar: 'دفع الاشتراك',
    },
    {
      key: 'referral_reward',
      name_en: 'Referral reward',
      name_ar: 'مكافأة الإحالة',
    },
  ],
  transaction_types: [
    { key: 'credit', name_en: 'Credit', name_ar: 'إضافة' },
    { key: 'debit', name_en: 'Debit', name_ar: 'خصم' },
  ],
  promo: [
    {
      key: 'referral_discount',
      name_en: 'Referral discount',
      name_ar: 'خصم الإحالة',
    },
    {
      key: 'promo_discount',
      name_en: 'Promo discount',
      name_ar: 'خصم ترويجي',
    },
  ],
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  const raw = typeof value === 'string' ? parseJson(value) : value
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return raw as Record<string, unknown>
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function parseLabelList(
  value: unknown,
  defaults: LocalizedLabel[]
): LocalizedLabel[] {
  if (!Array.isArray(value)) {
    return defaults.map(item => ({ ...item }))
  }
  const byKey = new Map<string, LocalizedLabel>()
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const key = asNonEmptyString(row.key)
    const nameEn = asNonEmptyString(row.name_en)
    const nameAr = asNonEmptyString(row.name_ar)
    if (!key || !nameEn || !nameAr) continue
    byKey.set(key, { key, name_en: nameEn, name_ar: nameAr })
  }
  return defaults.map(item => byKey.get(item.key) ?? { ...item })
}

/**
 * Accepts `app_settings.labels` JSON. Unknown groups/keys are ignored;
 * missing keys are filled from defaults.
 */
export function parseAppLabels(value: unknown): AppLabelsCatalog {
  const row = asObject(value)
  if (!row) {
    return {
      plans: DEFAULT_APP_LABELS.plans.map(item => ({ ...item })),
      wallet: DEFAULT_APP_LABELS.wallet.map(item => ({ ...item })),
      billing_categories: DEFAULT_APP_LABELS.billing_categories.map(item => ({
        ...item,
      })),
      transaction_types: DEFAULT_APP_LABELS.transaction_types.map(item => ({
        ...item,
      })),
      promo: DEFAULT_APP_LABELS.promo.map(item => ({ ...item })),
    }
  }
  return {
    plans: parseLabelList(row.plans, DEFAULT_APP_LABELS.plans),
    wallet: parseLabelList(row.wallet, DEFAULT_APP_LABELS.wallet),
    billing_categories: parseLabelList(
      row.billing_categories,
      DEFAULT_APP_LABELS.billing_categories
    ),
    transaction_types: parseLabelList(
      row.transaction_types,
      DEFAULT_APP_LABELS.transaction_types
    ),
    promo: parseLabelList(row.promo, DEFAULT_APP_LABELS.promo),
  }
}
