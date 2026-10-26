import type { UserDevice } from '../../entities/UserDevice.js'

/** One push per physical device. Duplicate token or endpoint rows are dropped. */
export function dedupeDevicesForPush(devices: UserDevice[]): UserDevice[] {
  const sorted = [...devices].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
  const seenTokens = new Set<string>()
  const seenEndpoints = new Set<string>()
  const recipients: UserDevice[] = []

  for (const device of sorted) {
    const token = device.deviceToken?.trim() ?? ''
    const endpoint = device.endpointArn?.trim() ?? ''
    if (!endpoint) continue
    if (token && seenTokens.has(token)) continue
    if (seenEndpoints.has(endpoint)) continue
    if (token) seenTokens.add(token)
    seenEndpoints.add(endpoint)
    recipients.push(device)
  }

  return recipients
}
