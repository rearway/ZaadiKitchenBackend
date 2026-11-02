import { createHash } from 'node:crypto'

import type { AppSetting } from '../../entities/AppSetting.js'
import {
  applyMealTypeDisplays,
  DEFAULT_MEAL_TYPES,
  parseMealTypes,
  type MealTypeDisplay,
} from '../../../shared/meal-display.js'

export interface PlatformVersion {
  min: string
  latest: string
  store_url: string
}

export interface AppVersions {
  ios: PlatformVersion
  android: PlatformVersion
}

export interface SupportContacts {
  whatsapp: string
  email: string
  phone: string
}

export interface OrderingSettings {
  cutoff_local_time: string
  timezone: string
  working_days: string[]
}

export interface FeatureFlags {
  menu_day_picker: boolean
  referrals: boolean
}

export type AppUpdateStatus = 'none' | 'optional' | 'force'

export interface AppSettingsResponse {
  version: string
  updated_at: string | null
  meal_types: MealTypeDisplay[]
  app_versions: AppVersions
  update: { status: AppUpdateStatus }
  support: SupportContacts
  ordering: OrderingSettings
  feature_flags: FeatureFlags
}

export const DEFAULT_APP_VERSIONS: AppVersions = {
  ios: {
    min: '1.0.0',
    latest: '1.0.0',
    store_url: 'https://apps.apple.com/app/id0000000000',
  },
  android: {
    min: '1.0.0',
    latest: '1.0.0',
    store_url:
      'https://play.google.com/store/apps/details?id=com.platio.placeholder',
  },
}

export const DEFAULT_SUPPORT: SupportContacts = {
  whatsapp: '+966500000000',
  email: 'support@platio.example',
  phone: '+966500000000',
}

export const DEFAULT_ORDERING: OrderingSettings = {
  cutoff_local_time: '18:00',
  timezone: 'Asia/Riyadh',
  working_days: ['sun', 'mon', 'tue', 'wed', 'thu'],
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  menu_day_picker: true,
  referrals: true,
}

interface Semver {
  major: number
  minor: number
  patch: number
  prerelease: string[]
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

function parsePlatform(
  value: unknown,
  fallback: PlatformVersion
): PlatformVersion {
  const row = asObject(value)
  if (!row) return { ...fallback }
  return {
    min: asNonEmptyString(row.min) ?? fallback.min,
    latest: asNonEmptyString(row.latest) ?? fallback.latest,
    store_url: asNonEmptyString(row.store_url) ?? fallback.store_url,
  }
}

function parseAppVersions(value: unknown): AppVersions {
  const row = asObject(value)
  if (!row) {
    return {
      ios: { ...DEFAULT_APP_VERSIONS.ios },
      android: { ...DEFAULT_APP_VERSIONS.android },
    }
  }
  return {
    ios: parsePlatform(row.ios, DEFAULT_APP_VERSIONS.ios),
    android: parsePlatform(row.android, DEFAULT_APP_VERSIONS.android),
  }
}

function parseSupport(value: unknown): SupportContacts {
  const row = asObject(value)
  if (!row) return { ...DEFAULT_SUPPORT }
  return {
    whatsapp: asNonEmptyString(row.whatsapp) ?? DEFAULT_SUPPORT.whatsapp,
    email: asNonEmptyString(row.email) ?? DEFAULT_SUPPORT.email,
    phone: asNonEmptyString(row.phone) ?? DEFAULT_SUPPORT.phone,
  }
}

function parseOrdering(value: unknown): OrderingSettings {
  const row = asObject(value)
  if (!row) {
    return {
      ...DEFAULT_ORDERING,
      working_days: [...DEFAULT_ORDERING.working_days],
    }
  }
  const days = Array.isArray(row.working_days)
    ? row.working_days.filter(
        (day): day is string => typeof day === 'string' && day.length > 0
      )
    : []
  return {
    cutoff_local_time:
      asNonEmptyString(row.cutoff_local_time) ??
      DEFAULT_ORDERING.cutoff_local_time,
    timezone: asNonEmptyString(row.timezone) ?? DEFAULT_ORDERING.timezone,
    working_days:
      days.length > 0 ? days : [...DEFAULT_ORDERING.working_days],
  }
}

function parseFlag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function parseFeatureFlags(value: unknown): FeatureFlags {
  const row = asObject(value)
  if (!row) return { ...DEFAULT_FEATURE_FLAGS }
  return {
    menu_day_picker: parseFlag(
      row.menu_day_picker,
      DEFAULT_FEATURE_FLAGS.menu_day_picker
    ),
    referrals: parseFlag(row.referrals, DEFAULT_FEATURE_FLAGS.referrals),
  }
}

export function parseSemver(input: string): Semver | null {
  const match = input
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/)
  if (!match) return null
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split('.') : [],
  }
}

/** Negative when `left` is older than `right`. Null when either side is not semver. */
export function compareSemver(left: string, right: string): number | null {
  const a = parseSemver(left)
  const b = parseSemver(right)
  if (!a || !b) return null
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  if (a.patch !== b.patch) return a.patch - b.patch
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0
  if (a.prerelease.length === 0) return 1
  if (b.prerelease.length === 0) return -1
  const length = Math.max(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < length; i++) {
    const as = a.prerelease[i]
    const bs = b.prerelease[i]
    if (as === undefined) return -1
    if (bs === undefined) return 1
    const aNum = /^\d+$/.test(as)
    const bNum = /^\d+$/.test(bs)
    if (aNum && bNum) {
      const diff = Number(as) - Number(bs)
      if (diff !== 0) return diff
      continue
    }
    if (aNum !== bNum) return aNum ? -1 : 1
    if (as !== bs) return as < bs ? -1 : 1
  }
  return 0
}

export function resolveAppUpdateStatus(input: {
  platform?: string
  appVersion?: string
  appVersions: AppVersions
}): AppUpdateStatus {
  if (input.platform !== 'ios' && input.platform !== 'android') return 'none'
  if (!input.appVersion) return 'none'
  const target = input.appVersions[input.platform]
  const againstMin = compareSemver(input.appVersion, target.min)
  const againstLatest = compareSemver(input.appVersion, target.latest)
  if (againstMin == null || againstLatest == null) return 'none'
  if (againstMin < 0) return 'force'
  if (againstLatest < 0) return 'optional'
  return 'none'
}

function rowValue(rows: AppSetting[], key: string): unknown {
  return rows.find(row => row.key === key)?.value
}

function latestUpdatedAt(rows: AppSetting[]): string | null {
  let max = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const time = new Date(row.updatedAt).getTime()
    if (Number.isFinite(time) && time > max) max = time
  }
  if (!Number.isFinite(max)) return null
  return new Date(max).toISOString()
}

export function buildAppSettingsResponse(
  rows: AppSetting[],
  query: { platform?: string; appVersion?: string } = {}
): AppSettingsResponse {
  const mealTypes = parseMealTypes(rowValue(rows, 'meal_types')) ?? [
    ...DEFAULT_MEAL_TYPES.map(item => ({ ...item })),
  ]
  applyMealTypeDisplays(mealTypes)
  const appVersions = parseAppVersions(rowValue(rows, 'app_versions'))
  const updatedAt = rows.length > 0 ? latestUpdatedAt(rows) : null
  return {
    version: updatedAt ?? 'defaults',
    updated_at: updatedAt,
    meal_types: mealTypes.map(item => ({ ...item })),
    app_versions: appVersions,
    update: {
      status: resolveAppUpdateStatus({
        platform: query.platform,
        appVersion: query.appVersion,
        appVersions,
      }),
    },
    support: parseSupport(rowValue(rows, 'support')),
    ordering: parseOrdering(rowValue(rows, 'ordering')),
    feature_flags: parseFeatureFlags(rowValue(rows, 'feature_flags')),
  }
}

export function appSettingsEtag(body: AppSettingsResponse): string {
  const hash = createHash('sha1').update(JSON.stringify(body)).digest('hex')
  return `"${hash}"`
}

export function ifNoneMatchSatisfied(
  header: string | string[] | undefined,
  etag: string
): boolean {
  if (!header) return false
  const raw = Array.isArray(header) ? header.join(',') : header
  return raw.split(',').some(part => {
    const value = part.trim()
    return value === etag || value === `W/${etag}`
  })
}
