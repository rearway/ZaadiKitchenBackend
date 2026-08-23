import { makeUC, ProcessDailyNotificationsInput } from '../ProcessDailyNotifications.js'
import { buildDeps } from '../../../../__tests__/helpers/mock-deps.js'
import { Deps } from '../../../entitygateway/index.js'

describe('ProcessDailyNotifications', () => {
  let deps: ReturnType<typeof buildDeps>
  let processDailyNotifications: ReturnType<typeof makeUC>

  beforeEach(() => {
    deps = buildDeps()
    processDailyNotifications = makeUC(deps as unknown as Deps)
  })

  it('should process daily notifications and return success', async () => {
    const input: ProcessDailyNotificationsInput = {
      targetDateStr: '2026-08-23'
    }

    const result = await processDailyNotifications(input)

    expect(result.message).toBe('Daily notifications processed successfully')
    expect(result.date).toBe('2026-08-23')
    expect(deps.logger.log).toHaveBeenCalledWith('Processing daily notifications for 2026-08-23')
  })
})
