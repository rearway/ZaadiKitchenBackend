import { AdminDailyOpsController } from './admin-daily-ops.controller.js'
import type { UseCases } from '../../core/usecases/index.js'

describe('AdminDailyOpsController.forcePipelineLock', () => {
  it('forwards the delivery date and admin id to the force-lock use case', async () => {
    const forcePipelineLock = jest.fn().mockResolvedValue({
      date: '2099-12-27',
      previous_stage: 'pending',
      current_stage: 'locked',
      frozen: true,
    })
    const controller = new AdminDailyOpsController({
      commands: { forcePipelineLock },
    } as unknown as UseCases)

    const response = await controller.forcePipelineLock(
      { date: '2099-12-27' },
      { id: 'admin-1', role: 'ADMIN' }
    )

    expect(forcePipelineLock).toHaveBeenCalledWith({
      date: '2099-12-27',
      forcedByUserId: 'admin-1',
    })
    expect(response).toMatchObject({ current_stage: 'locked', frozen: true })
  })
})
