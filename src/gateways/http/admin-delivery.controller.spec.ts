import { AdminDeliveryController } from './admin-delivery.controller.js'
import type { UseCases } from '../../core/usecases/index.js'

describe('AdminDeliveryController.deleteDeliveryArea', () => {
  it('forwards DELETE /api/v1/admin/areas/:area_id to soft-delete', async () => {
    const deleteDeliveryArea = jest.fn().mockResolvedValue({
      message: 'Delivery area deleted successfully',
      data: {
        id: 'area-1',
        deleted: true,
        deletedAt: '2026-10-25T00:00:00.000Z',
      },
    })
    const controller = new AdminDeliveryController({
      commands: { deleteDeliveryArea },
    } as unknown as UseCases)

    const response = await controller.deleteDeliveryArea('area-1')

    expect(deleteDeliveryArea).toHaveBeenCalledWith({ areaId: 'area-1' })
    expect(response.data).toEqual({
      id: 'area-1',
      deleted: true,
      deletedAt: '2026-10-25T00:00:00.000Z',
    })
  })
})
