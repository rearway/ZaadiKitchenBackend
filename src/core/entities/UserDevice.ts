export interface UserDevice {
  id: string
  userId: string
  platform: 'ios' | 'android'
  deviceToken: string
  endpointArn: string
  subscriptionArn: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
