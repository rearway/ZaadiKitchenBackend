import { MenuController } from './menu.controller'
import type { UseCases } from '../../core/usecases/index'
import type { UserWithoutPassword } from '../../core/entities/index'

describe('MenuController.getMenuWeek', () => {
  it('forwards the optional date without changing callers that omit it', async () => {
    const getCustomerMenuWeek = jest.fn().mockResolvedValue({
      this_week: {},
      next_week: {},
    })
    const controller = new MenuController({
      queries: { getCustomerMenuWeek },
    } as unknown as UseCases)
    const user = { id: 'user-1' } as UserWithoutPassword

    await controller.getMenuWeek(user, { meal_type: 'all' })
    await controller.getMenuWeek(user, { meal_type: 'salad', date: '2026-09-16' })

    expect(getCustomerMenuWeek).toHaveBeenNthCalledWith(1, {
      userId: 'user-1',
      mealType: 'all',
      date: undefined,
    })
    expect(getCustomerMenuWeek).toHaveBeenNthCalledWith(2, {
      userId: 'user-1',
      mealType: 'salad',
      date: '2026-09-16',
    })
  })
})
